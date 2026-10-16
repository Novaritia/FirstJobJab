// Test-only helper: pdfjs-dist legacy build → {str,x,y} items per page (same shape the api produces).
import { readFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function pdfItems(file: string, password: string) {
  const task = getDocument({ data: new Uint8Array(readFileSync(file)), password, useSystemFonts: false });
  const doc = await task.promise;
  const pages: { str: string; x: number; y: number }[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    pages.push(tc.items.filter((i) => 'str' in i).map((i: any) => ({ str: i.str, x: i.transform[4], y: i.transform[5] })));
  }
  await task.destroy();
  return pages;
}
