import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { env } from '../env';
import { supabase } from '../supabase';
import { runLocalAnalysis } from '../lib/analysis';

const RunSchema = z.object({
  jobId: z.string().min(1),
  cvId: z.string().min(1),
});

export const analysesRouter = Router();

analysesRouter.post('/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId, cvId } = RunSchema.parse(req.body ?? {});
    const result = await runLocalAnalysis(jobId, cvId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

analysesRouter.get('/by-cv/:cvId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from(env.SUPABASE_ANALYSIS_TABLE)
      .select('*')
      .eq('cvId', req.params.cvId)
      .order('createdAt', { ascending: false });
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    next(err);
  }
});

analysesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from(env.SUPABASE_ANALYSIS_TABLE)
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Analysis not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});
