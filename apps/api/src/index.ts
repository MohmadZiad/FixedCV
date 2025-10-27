import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env, isProd } from './env';
import { cvRouter } from './routes/cv';
import { jobsRouter } from './routes/jobs';
import { analysesRouter } from './routes/analyses';

const app = express();

const corsOrigins = env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: corsOrigins?.length ? corsOrigins : true,
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

if (!isProd) {
  app.use(morgan('dev'));
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.use('/api/cv', cvRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/analyses', analysesRouter);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API error:', err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  const message = err?.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

app.listen(env.PORT, () => {
  console.log(`🚀 API ready on http://localhost:${env.PORT}`);
});
