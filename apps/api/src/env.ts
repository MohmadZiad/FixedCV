import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default('cvs'),
  SUPABASE_CV_TABLE: z.string().default('CVs'),
  SUPABASE_JOB_TABLE: z.string().default('Jobs'),
  SUPABASE_REQUIREMENTS_TABLE: z.string().default('JobRequirements'),
  SUPABASE_ANALYSIS_TABLE: z.string().default('Analysis'),
  SUPABASE_ANALYSIS_CHUNKS_TABLE: z.string().default('AnalysisChunks'),
  CORS_ORIGIN: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);

export const isProd = env.NODE_ENV === 'production';
