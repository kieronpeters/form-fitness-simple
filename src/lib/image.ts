export interface CompressedImage {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

const MAX_FILE_BYTES = 20 * 1024 * 1024;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That image could not be opened. Try a JPG or PNG.'));
    image.src = url;
  });
}

/**
 * Reads a user-selected image and downsizes it to a sensible data URL so photos
 * stay fast and comfortably within local storage limits.
 */
export async function compressImageFile(
  file: File,
  { maxDimension = 1080, quality = 0.8 }: { maxDimension?: number; quality?: number } = {},
): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG or HEIC).');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('That image is larger than 20 MB. Try a smaller photo.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not process that image.');
    context.drawImage(image, 0, 0, width, height);

    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    let size = Math.round((dataUrl.length * 3) / 4);
    if (size > 900_000) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.62);
      size = Math.round((dataUrl.length * 3) / 4);
    }

    return { dataUrl, width, height, bytes: size };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
