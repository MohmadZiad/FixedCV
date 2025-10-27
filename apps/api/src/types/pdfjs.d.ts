declare module 'pdfjs-dist/legacy/build/pdf.js' {
  import type { PDFDocumentProxy, PDFPageProxy, TextContent } from 'pdfjs-dist';
  export interface TextItem {
    str?: string;
  }
  export interface TextContentEx extends TextContent {
    items: TextItem[];
  }
  export interface PDFJS { 
    getDocument(src: any): { promise: Promise<PDFDocumentProxy> };
    GlobalWorkerOptions: { workerSrc: any };
  }
  const pdfjs: any;
  export const GlobalWorkerOptions: { workerSrc: any };
  export function getDocument(src: any): { promise: Promise<PDFDocumentProxy> };
  export type { PDFDocumentProxy, PDFPageProxy, TextContent };
  export default pdfjs;
}

declare module 'pdfjs-dist/legacy/build/pdf.worker.js' {
  const worker: any;
  export default worker;
}
