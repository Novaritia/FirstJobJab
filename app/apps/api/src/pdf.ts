import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { getDocument, PasswordResponses, type PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';

const pdfjsDir = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
const asset = (d: string) => join(pdfjsDir, d) + '/';

export type PdfItem = { str: string; x: number; y: number };
export class PdfPasswordError extends Error {}

/** Text items per page. Throws PdfPasswordError when locked and `password` is missing/wrong. Password is never stored. */
export const extractPdfItems = (data: Buffer, password?: string): Promise<PdfItem[][]> =>
  withPdf(data, password, async (page) =>
    (await page.getTextContent()).items.flatMap((it) =>
      'str' in it && it.str.trim() ? [{ str: it.str, x: it.transform[4] as number, y: it.transform[5] as number }] : []));

/** Each page as PNG, for OCR of scanned (image-only) statements. */
export const renderPdfPages = (data: Buffer, password?: string, dpi = 200): Promise<Buffer[]> =>
  withPdf(data, password, async (page) => {
    const viewport = page.getViewport({ scale: dpi / 72 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;
    return canvas.toBuffer('image/png');
  });

async function withPdf<T>(data: Buffer, password: string | undefined, perPage: (page: PDFPageProxy) => Promise<T>): Promise<T[]> {
  const task = getDocument({
      data: new Uint8Array(data), // copy: pdf.js detaches the buffer
      password,
      useSystemFonts: false,
      cMapUrl: asset('cmaps'),
      cMapPacked: true,
      standardFontDataUrl: asset('standard_fonts'),
      wasmUrl: asset('wasm'),
      verbosity: 0,
  });
  let doc;
  try {
    doc = await task.promise;
  } catch (e) {
    await task.destroy();
    const code = (e as { code?: number }).code;
    if ((e as Error).name === 'PasswordException' && (code === PasswordResponses.NEED_PASSWORD || code === PasswordResponses.INCORRECT_PASSWORD)) {
      throw new PdfPasswordError('password_required');
    }
    throw e;
  }
  try {
    const pages: T[] = [];
    for (let p = 1; p <= doc.numPages; p++) pages.push(await perPage(await doc.getPage(p)));
    return pages;
  } finally {
    await task.destroy();
  }
}
