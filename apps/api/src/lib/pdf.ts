import type { PDFDocumentProxy } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.js';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

export async function parsePdf(buffer: Buffer): Promise<string> {
  const doc: PDFDocumentProxy = await (pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  }) as any).promise;
  let text = '';
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const pageText = (content.items as any[])
      .map((item) => (typeof item?.str === 'string' ? item.str : ''))
      .join(' ');
    text += pageText + '\n';
  }
  await doc.cleanup();
  return text.trim();
}
