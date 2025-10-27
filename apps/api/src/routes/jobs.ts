import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { env } from '../env';
import { supabase } from '../supabase';

const RequirementSchema = z.object({
  id: z.string().optional(),
  requirement: z.string().min(3),
  mustHave: z.boolean().optional().default(true),
  weight: z.number().optional().default(1),
});

const CreateJobSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  requirements: z.array(RequirementSchema).optional(),
});

const SuggestSchema = z.object({
  jdText: z.string().min(10),
});

export const jobsRouter = Router();

jobsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateJobSchema.parse(req.body);
    const id = uuidv4();
    const { error: jobError } = await supabase.from(env.SUPABASE_JOB_TABLE).insert({
      id,
      title: input.title,
      description: input.description,
    });
    if (jobError) throw jobError;

    if (input.requirements?.length) {
      const payload = input.requirements.map((r) => ({
        id: uuidv4(),
        jobId: id,
        requirement: r.requirement,
        mustHave: r.mustHave ?? true,
        weight: r.weight ?? 1,
      }));
      const { error: reqError } = await supabase
        .from(env.SUPABASE_REQUIREMENTS_TABLE)
        .insert(payload);
      if (reqError) throw reqError;
    }

    const { data: job } = await supabase
      .from(env.SUPABASE_JOB_TABLE)
      .select('id, title, description, createdAt')
      .eq('id', id)
      .single();

    res.json(job ?? { id, ...input });
  } catch (err) {
    next(err);
  }
});

jobsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from(env.SUPABASE_JOB_TABLE)
      .select('id, title, description, createdAt, requirements:JobRequirements(id, requirement, mustHave, weight)')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    res.json({ items: data ?? [] });
  } catch (err) {
    next(err);
  }
});

jobsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from(env.SUPABASE_JOB_TABLE)
      .select('id, title, description, createdAt, requirements:JobRequirements(id, requirement, mustHave, weight)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Job not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

jobsRouter.post('/:id/requirements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = z.array(RequirementSchema).parse(req.body?.items ?? []);
    if (!items.length) {
      return res.status(400).json({ error: 'لا توجد متطلبات لإضافتها' });
    }
    const payload = items.map((r) => ({
      id: uuidv4(),
      jobId: req.params.id,
      requirement: r.requirement,
      mustHave: r.mustHave ?? true,
      weight: r.weight ?? 1,
    }));
    const { error } = await supabase
      .from(env.SUPABASE_REQUIREMENTS_TABLE)
      .insert(payload);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

jobsRouter.patch('/requirements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = RequirementSchema.partial().parse(req.body ?? {});
    const { error } = await supabase
      .from(env.SUPABASE_REQUIREMENTS_TABLE)
      .update(payload)
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

jobsRouter.delete('/requirements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from(env.SUPABASE_REQUIREMENTS_TABLE)
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

jobsRouter.post('/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jdText } = SuggestSchema.parse(req.body ?? {});
    const sentences = jdText
      .split(/\n+|[\.\!\؟\!]/)
      .map((s) => s.trim())
      .filter((s) => s.split(/\s+/).length >= 4);

    const items = sentences.slice(0, 8).map((sentence) => ({
      requirement: sentence,
      mustHave: /\b(must|should|required|ضروري|يجب)\b/i.test(sentence),
      weight: /\b(preferred|يفضل|plus)\b/i.test(sentence) ? 0.8 : 1,
    }));

    res.json({ items });
  } catch (err) {
    next(err);
  }
});
