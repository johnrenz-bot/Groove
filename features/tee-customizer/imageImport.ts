/**
 * Shared upload plumbing for the Import panel and the Logos panel.
 *
 * Keeps file picking, validation, downscaling and data-URL encoding in one
 * place so both entry points accept exactly the same formats under exactly
 * the same limits.
 */

import { prepareImageFile } from './fileValidation';
import { MAX_TEE_IMAGES } from './constants';

export interface PreparedUpload {
  file: File;
  image: Awaited<ReturnType<typeof prepareImageFile>>;
}

/**
 * Validates and prepares a batch of files against the remaining slots.
 * Never throws — problems are returned as human-readable strings.
 */
export async function prepareUploads(
  files: File[],
  existingImageCount: number
): Promise<{ prepared: PreparedUpload[]; errors: string[] }> {
  const room = Math.max(0, MAX_TEE_IMAGES - existingImageCount);
  const errors: string[] = [];
  const prepared: PreparedUpload[] = [];

  if (room === 0) {
    return {
      prepared,
      errors: [`This design already has the maximum of ${MAX_TEE_IMAGES} imported images.`],
    };
  }

  if (files.length > room) {
    errors.push(`Only ${room} more image${room === 1 ? '' : 's'} fit in this design.`);
  }

  for (const file of files.slice(0, room)) {
    try {
      prepared.push({ file, image: await prepareImageFile(file) });
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : `“${file.name}” could not be imported.`
      );
    }
  }

  return { prepared, errors };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('The image could not be encoded.'));
    reader.readAsDataURL(blob);
  });
}

/** Fetches a same-origin public asset and returns it as an embeddable data URL. */
export async function fetchAssetAsDataUrl(src: string): Promise<{ dataUrl: string; mimeType: string; bytes: number }> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`The logo asset could not be loaded (${response.status}).`);
  }
  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  return { dataUrl, mimeType: blob.type || 'image/png', bytes: blob.size };
}
