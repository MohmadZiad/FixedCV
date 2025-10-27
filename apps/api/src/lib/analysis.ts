import { v4 as uuidv4 } from 'uuid';
import { env } from '../env';
import { supabase } from '../supabase';
import { cosineSimilarity, splitParagraphs, tokenize } from './text';

export interface RequirementMatch {
  id: string;
  requirement: string;
  mustHave: boolean;
  weight: number;
  similarity: number;
  score10: number;
  bestChunk?: { section: string; content: string; similarity: number };
}

export interface AnalysisResult {
  id: string;
  jobId: string;
  cvId: string;
  status: string;
  score: number;
  breakdown: RequirementMatch[];
  gaps: { mustHaveMissing: string[]; improve: string[] };
  model: string;
}

export async function runLocalAnalysis(jobId: string, cvId: string): Promise<AnalysisResult> {
  const { data: job, error: jobError } = await supabase
    .from(env.SUPABASE_JOB_TABLE)
    .select('id, title, description')
    .eq('id', jobId)
    .single();
  if (jobError || !job) {
    throw new Error('لم يتم العثور على الوظيفة المطلوبة');
  }

  const { data: reqs, error: reqError } = await supabase
    .from(env.SUPABASE_REQUIREMENTS_TABLE)
    .select('id, requirement, mustHave, weight')
    .eq('jobId', jobId)
    .order('createdAt', { ascending: true });
  if (reqError) {
    throw new Error(`فشل تحميل المتطلبات: ${reqError.message}`);
  }
  if (!reqs?.length) {
    throw new Error('لا توجد متطلبات للوظيفة بعد.');
  }

  const { data: cv, error: cvError } = await supabase
    .from(env.SUPABASE_CV_TABLE)
    .select('id, parsedText, lang, storagePath, originalFilename')
    .eq('id', cvId)
    .single();
  if (cvError || !cv) {
    throw new Error('لم يتم العثور على السيرة الذاتية المطلوبة');
  }
  const cvText = cv.parsedText ?? '';
  if (!cvText) {
    throw new Error('لم يتم حفظ نص السيرة الذاتية. الرجاء إعادة الرفع.');
  }

  const paragraphs = splitParagraphs(cvText);
  const cvTokens = tokenize(cvText);
  const breakdown: RequirementMatch[] = [];

  for (const req of reqs) {
    const reqTokens = tokenize(req.requirement);
    const baseSim = cosineSimilarity(reqTokens, cvTokens);
    let bestChunk: RequirementMatch['bestChunk'];
    let bestScore = baseSim;
    for (const para of paragraphs) {
      const paraTokens = tokenize(para);
      const sim = cosineSimilarity(reqTokens, paraTokens);
      if (sim > (bestChunk?.similarity ?? -1)) {
        bestChunk = { section: 'paragraph', content: para, similarity: sim };
      }
      if (sim > bestScore) bestScore = sim;
    }
    breakdown.push({
      id: req.id,
      requirement: req.requirement,
      mustHave: req.mustHave ?? false,
      weight: req.weight ?? 1,
      similarity: Number(bestScore.toFixed(4)),
      score10: Number((bestScore * 10).toFixed(2)),
      bestChunk,
    });
  }

  const totalWeight = breakdown.reduce((sum, r) => sum + (r.weight || 1), 0) || 1;
  const weightedScore =
    breakdown.reduce((sum, r) => sum + (r.score10 * (r.weight || 1)), 0) /
    totalWeight;

  const mustHaveMissing = breakdown
    .filter((r) => r.mustHave && r.similarity < 0.5)
    .map((r) => r.requirement);
  const improve = breakdown
    .filter((r) => !r.mustHave && r.similarity < 0.5)
    .map((r) => r.requirement);

  const result: AnalysisResult = {
    id: uuidv4(),
    jobId,
    cvId,
    status: 'completed',
    score: Number(weightedScore.toFixed(2)),
    breakdown,
    gaps: { mustHaveMissing, improve },
    model: 'local-cosine-v1',
  };

  const { error: insertError } = await supabase
    .from(env.SUPABASE_ANALYSIS_TABLE)
    .insert({
      id: result.id,
      jobId: result.jobId,
      cvId: result.cvId,
      status: result.status,
      score: result.score,
      breakdown: result.breakdown,
      gaps: result.gaps,
      model: result.model,
    });
  if (insertError) {
    throw new Error(`تعذّر حفظ نتيجة التحليل في Supabase: ${insertError.message}`);
  }

  if (paragraphs.length) {
    const chunkPayload = paragraphs.map((content, idx) => ({
      id: uuidv4(),
      analysisId: result.id,
      chunkIndex: idx,
      section: 'paragraph',
      content,
      strength: null,
    }));
    const { error: chunkError } = await supabase
      .from(env.SUPABASE_ANALYSIS_CHUNKS_TABLE)
      .insert(chunkPayload);
    if (chunkError) {
      console.warn('⚠️ Failed to store analysis chunks', chunkError.message);
    }
  }

  return result;
}
