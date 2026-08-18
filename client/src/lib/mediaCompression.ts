/**
 * Brauzerda rasmni siqish (kutubxonasiz, canvas orqali).
 * Videolar siqilmaydi — ular presigned URL orqali to'g'ridan-to'g'ri yuboriladi.
 */
export const MEDIA_MAX_BYTES = 200 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;
export const ACCEPTED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES] as readonly string[];

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function validateMediaFile(file: Pick<File, 'type' | 'size' | 'name'>): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `"${file.name}" formati qo'llab-quvvatlanmaydi. Faqat JPG, PNG, WEBP, MP4, WEBM, MOV.`;
  }
  if (file.size > MEDIA_MAX_BYTES) {
    return `"${file.name}" hajmi ${formatBytes(file.size)} — 200 MB chegarasidan katta.`;
  }
  if (file.size === 0) return `"${file.name}" bo'sh fayl.`;
  return null;
}

export type CompressionResult = { file: File; originalSize: number; compressed: boolean };

/** Rasmni maksimal 1920px ga keltirib, WEBP/JPEG sifatida siqadi. */
export async function compressImage(
  file: File,
  options: { maxDimension?: number; quality?: number; maxBytes?: number } = {},
): Promise<CompressionResult> {
  const { maxDimension = 1920, quality = 0.82, maxBytes = 1.5 * 1024 * 1024 } = options;
  const originalSize = file.size;
  if (!file.type.startsWith('image/') || typeof document === 'undefined') return { file, originalSize, compressed: false };
  if (file.size <= maxBytes) return { file, originalSize, compressed: false };
  try {
    const bitmap = await loadImage(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return { file, originalSize, compressed: false };
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    const targetType = file.type === 'image/png' ? 'image/webp' : file.type;
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, targetType, quality));
    if (!blob || blob.size >= file.size) return { file, originalSize, compressed: false };
    const name = file.name.replace(/\.[^.]+$/, '') + (targetType === 'image/webp' ? '.webp' : '.jpg');
    return { file: new File([blob], name, { type: targetType }), originalSize, compressed: true };
  } catch (error) {
    console.warn('[media] Siqib bo\'lmadi, original yuboriladi:', error);
    return { file, originalSize, compressed: false };
  }
}

function loadImage(file: File): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Rasmni o\'qib bo\'lmadi')); };
    img.src = url;
  });
}
