/**
 * Shared client-side file checks for registration and profile uploads.
 *
 * These mirror the limits already enforced by the registration forms and the
 * Storage bucket: PDF/JPG/PNG documents up to 5 MB. Validation here is purely
 * for fast feedback — the upload path and bucket policies remain the authority.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const DOCUMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'] as const;
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png'] as const;

export type UploadExtension = (typeof DOCUMENT_EXTENSIONS)[number];

export function getFileExtension(name: string): string {
  const parts = name.toLowerCase().split('.');
  return parts.length > 1 ? (parts.pop() ?? '') : '';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateUploadFile(
  file: File,
  {
    allowedExtensions = DOCUMENT_EXTENSIONS,
    maxBytes = MAX_UPLOAD_BYTES,
    noun = 'file',
  }: {
    allowedExtensions?: readonly string[];
    maxBytes?: number;
    noun?: string;
  } = {}
): string | null {
  const extension = getFileExtension(file.name);

  if (!extension || !allowedExtensions.includes(extension)) {
    const formatted = allowedExtensions
      .map((value) => value.toUpperCase())
      .filter((value, index, list) => list.indexOf(value) === index)
      .join(', ');
    return `Choose a ${noun} in ${formatted} format.`;
  }

  if (file.size > maxBytes) {
    return `The ${noun} is too large. Use a file under ${formatFileSize(maxBytes)}.`;
  }

  if (file.size === 0) {
    return `The selected ${noun} is empty. Choose another file.`;
  }

  return null;
}
