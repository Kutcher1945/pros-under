import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, UPLOAD_EXTENSIONS } from './constants';
import { opekaApi } from './opeka-api';
import type { CaseDocument } from './types';

// Opened in a tab only when the browser renders the type inertly; anything else is saved.
const PREVIEW_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

/** Quick client-side check before upload (the backend validates again, including content). */
export function uploadError(file: { name: string; size: number } | null | undefined): string | null {
  if (!file || !file.size) return 'Выберите файл.';
  if (file.size > MAX_UPLOAD_BYTES) return `Файл должен быть не больше ${MAX_UPLOAD_MB} МБ.`;
  if (!UPLOAD_EXTENSIONS.test(file.name)) return 'Допустимы PDF, DOCX, XLSX, JPG и PNG.';
  return null;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function canPreview(doc: CaseDocument): boolean {
  return !!doc.contentType && PREVIEW_TYPES.has(doc.contentType);
}

/** Fetches a document with the session token, then previews or saves it; returns an error message. */
export async function openDocument(doc: CaseDocument, mode: 'open' | 'download'): Promise<string | null> {
  let blob: Blob;
  try {
    blob = await opekaApi.documentFile(doc.id);
  } catch (err) {
    return err instanceof Error ? err.message : 'Не удалось получить файл.';
  }
  if (mode === 'download' || !PREVIEW_TYPES.has(blob.type)) {
    downloadBlob(blob, doc.name);
    return null;
  }
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return null;
}
