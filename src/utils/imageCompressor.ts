/**
 * Resizes an image to a maximum dimension (default 1280px) and compresses to JPEG quality 0.8
 * ensuring phone photos are under ~500KB for rapid upload.
 */
export async function compressImageClient(
  fileOrBase64: File | string,
  maxDimension = 1280,
  quality = 0.8
): Promise<{ dataUrl: string; sizeBytes: number; width: number; height: number }> {
  // In node environment (for testing) or browser
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const raw = typeof fileOrBase64 === 'string' ? fileOrBase64 : 'mock_data';
    return { dataUrl: raw, sizeBytes: raw.length, width: maxDimension, height: maxDimension };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Fill white background for transparent images
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      // Approximate size from base64 length
      const sizeBytes = Math.round((dataUrl.length * 3) / 4);

      resolve({
        dataUrl,
        sizeBytes,
        width,
        height,
      });
    };

    img.onerror = (e) => reject(new Error('Failed to load image for compression'));

    if (typeof fileOrBase64 === 'string') {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBase64);
    }
  });
}

/**
 * Calculates resized dimensions maintaining aspect ratio.
 */
export function calculateResizeDimensions(
  origWidth: number,
  origHeight: number,
  maxDim = 1280
): { width: number; height: number } {
  if (origWidth <= maxDim && origHeight <= maxDim) {
    return { width: origWidth, height: origHeight };
  }
  if (origWidth > origHeight) {
    return {
      width: maxDim,
      height: Math.round((origHeight * maxDim) / origWidth),
    };
  } else {
    return {
      width: Math.round((origWidth * maxDim) / origHeight),
      height: maxDim,
    };
  }
}
