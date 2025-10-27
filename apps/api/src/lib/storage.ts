import { createHash } from 'crypto';
import { supabase } from '../supabase';
import { env } from '../env';

function sanitizeFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\.\-]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'file'
  );
}

export async function ensureBucket(): Promise<void> {
  const bucket = env.SUPABASE_STORAGE_BUCKET;
  const { data } = await supabase.storage.getBucket(bucket);
  if (data) return;
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 20 * 1024 * 1024,
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`تعذّر تجهيز حاوية التخزين: ${error.message}`);
  }
}

export async function uploadCvBinary(
  buffer: Buffer,
  contentType: string,
  originalName: string,
): Promise<{ path: string; publicUrl?: string }> {
  await ensureBucket();
  const bucket = env.SUPABASE_STORAGE_BUCKET;
  const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 10);
  const safe = sanitizeFileName(originalName);
  const path = `${hash}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });
  if (error) {
    throw new Error(`فشل رفع الملف إلى Supabase Storage: ${error.message}`);
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data?.publicUrl };
}
