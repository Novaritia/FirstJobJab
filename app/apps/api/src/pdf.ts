import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { getDocument, PasswordResponses } from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfjsDir = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
const asset = (d: string) => join(pdfjsDir, d) + '/';

export type PdfItem = { str: string; x: number; y: number };
export class PdfPasswordError extends Error {}

/** Text items per page. Throws PdfPasswordError when locked and `password` is missing/wrong. Password is never stored. */
export async function extractPdfItems(data: Buffer, password?: string): Promise<PdfItem[][]> {
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
    const pages: PdfItem[][] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const content = await (await doc.getPage(p)).getTextContent();
      pages.push(
        content.items.flatMap((it) => ('str' in it && it.str.trim() ? [{ str: it.str, x: it.transform[4] as number, y: it.transform[5] as number }] : [])),
      );
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
