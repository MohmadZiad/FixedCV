import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { detectLang } from '@lingua/core';
import { env } from '../env';
import { supabase } from '../supabase';
import { parsePdf } from '../lib/pdf';
import { parseDocx } from '../lib/docx';
import { uploadCvBinary } from '../lib/storage';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function resolveExt(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx + 1).toLowerCase() : '';
}

const SUPPORTED = new Set(['pdf', 'doc', 'docx']);

export const cvRouter = Router();

cvRouter.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'لم يتم إرسال أي ملف' });
    }
    const { originalname, buffer, mimetype } = req.file;
    const ext = resolveExt(originalname);
    if (!SUPPORTED.has(ext)) {
      return res.status(400).json({
        ok: false,
        message: 'نوع الملف غير مدعوم. المسموح: PDF, DOC, DOCX',
      });
    }

    let parsedText = '';
    if (ext === 'pdf') {
      parsedText = await parsePdf(buffer);
    } else {
      parsedText = await parseDocx(buffer);
    }

    const lang = parsedText ? detectLang(parsedText) : null;
    const { path, publicUrl } = await uploadCvBinary(buffer, mimetype, originalname);

    const id = uuidv4();
    const { error } = await supabase.from(env.SUPABASE_CV_TABLE).insert({
      id,
      originalFilename: originalname,
      storagePath: path,
      parsedText,
      lang,
    });
    if (error) {
      throw new Error(`تعذّر حفظ بيانات السيرة الذاتية: ${error.message}`);
    }

    res.json({
      ok: true,
      cvId: id,
      parts: 1,
      storagePath: path,
      publicUrl,
      parsed: Boolean(parsedText),
      textLength: parsedText.length,
    });
  } catch (err) {
    next(err);
  }
});

cvRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from(env.SUPABASE_CV_TABLE)
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    res.json({ items: data ?? [] });
  } catch (err) {
    next(err);
  }
});

cvRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from(env.SUPABASE_CV_TABLE)
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'CV غير موجود' });
    res.json({ cv: data });
  } catch (err) {
    next(err);
  }
});
