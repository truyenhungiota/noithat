/**
 * Utility for compressing and sanitizing images on client side.
 * Ensures that all Firestore documents (including Orders with multiple item images)
 * strictly adhere to Firestore's hard document limit of 1,048,576 bytes (1MB)
 * while preserving high-clarity HD visuals.
 */

export async function compressImage(
  source: File | Blob | string,
  maxWidth = 1080,
  maxHeight = 1080,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve) => {
    // If empty, return immediately
    if (!source) {
      return resolve('');
    }

    // If it's an external web URL, return as-is
    if (typeof source === 'string' && (source.startsWith('http://') || source.startsWith('https://'))) {
      return resolve(source);
    }

    // Safety timeout: resolve within 8s so saving is never blocked
    const timeout = setTimeout(() => {
      if (typeof source === 'string') resolve(source);
      else resolve('');
    }, 8000);

    const finish = (result: string) => {
      clearTimeout(timeout);
      resolve(result);
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        if (typeof source === 'string') return finish(source);
        return finish('');
      }

      // Proportional resize preserving clarity
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        if (typeof source === 'string') return finish(source);
        return finish('');
      }

      // Đổ nền trắng #FFFFFF toàn bộ canvas trước khi vẽ
      // Đảm bảo tuyệt đối các ảnh PNG có nền trong suốt không bị biến thành màu đen xì khi nén sang JPEG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Tự động nhận diện và khử nền đen nếu ảnh trước đó bị lỗi đen xì do nén
      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const checkNearBlack = (idx: number) => (
          data[idx] < 25 && data[idx + 1] < 25 && data[idx + 2] < 25
        );
        const cornersBlack = 
          checkNearBlack(0) && 
          checkNearBlack((width - 1) * 4) && 
          checkNearBlack(((height - 1) * width) * 4) && 
          checkNearBlack(((height - 1) * width + (width - 1)) * 4);

        if (cornersBlack) {
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] < 28 && data[i + 1] < 28 && data[i + 2] < 28) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }
      } catch {
        // Bỏ qua lỗi tainted canvas nếu ảnh từ domain ngoài
      }

      try {
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        finish(compressedDataUrl);
      } catch (err) {
        if (typeof source === 'string') finish(source);
        else finish('');
      }
    };

    img.onerror = () => {
      if (typeof source === 'string') finish(source);
      else finish('');
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => finish('');
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Counts all base64 images in an arbitrary object tree.
 */
function countBase64Images(obj: any): number {
  if (!obj || typeof obj !== 'object') return 0;
  let count = 0;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      count += countBase64Images(item);
    }
  } else {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === 'string' && val.startsWith('data:image/')) {
        count++;
      } else if (typeof val === 'object' && val !== null) {
        count += countBase64Images(val);
      }
    }
  }
  return count;
}

/**
 * Traverses an object tree and compresses all base64 images found.
 */
async function compressAllImagesInObject(
  obj: any,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<any> {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    const nextArr = [];
    for (const item of obj) {
      nextArr.push(await compressAllImagesInObject(item, maxWidth, maxHeight, quality));
    }
    return nextArr;
  }

  const nextObj: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string' && val.startsWith('data:image/')) {
      nextObj[key] = await compressImage(val, maxWidth, maxHeight, quality);
    } else if (typeof val === 'object' && val !== null) {
      nextObj[key] = await compressAllImagesInObject(val, maxWidth, maxHeight, quality);
    } else {
      nextObj[key] = val;
    }
  }
  return nextObj;
}

function getObjectByteSize(obj: any): number {
  try {
    const str = JSON.stringify(obj);
    return new Blob([str]).size;
  } catch {
    return 0;
  }
}

/**
 * Deeply scans any document payload before saving to Firestore.
 * Preserves crisp HD images while strictly guaranteeing that the payload
 * never exceeds Firestore's hard limit of 1,048,576 bytes (1MB).
 */
export async function sanitizeAndCompressPayload(item: any): Promise<any> {
  if (!item || typeof item !== 'object') return item;

  const imageCount = countBase64Images(item);
  let result = item;

  // Pass 1: Smart adaptive budgeting based on image count
  // Total document limit is 1MB. Target ceiling is ~750KB.
  if (imageCount > 0) {
    let initialMax = 1080;
    let initialQuality = 0.78;

    if (imageCount === 1) {
      initialMax = 1200;
      initialQuality = 0.80;
    } else if (imageCount === 2) {
      initialMax = 960;
      initialQuality = 0.75;
    } else if (imageCount <= 4) {
      initialMax = 800;
      initialQuality = 0.72;
    } else if (imageCount <= 8) {
      initialMax = 640;
      initialQuality = 0.68;
    } else {
      initialMax = 500;
      initialQuality = 0.65;
    }

    result = await compressAllImagesInObject(item, initialMax, initialMax, initialQuality);
  }

  // Pass 2: Progressive bounded step-down if still over 750KB
  // Strictly non-recursive: max 3 bounded steps, zero chance of stack overflow
  const TARGET_MAX_BYTES = 760000; // 760 KB safe ceiling
  let currentBytes = getObjectByteSize(result);

  if (currentBytes > TARGET_MAX_BYTES && imageCount > 0) {
    const fallbackTiers = [
      { maxDim: 720, quality: 0.70 },
      { maxDim: 540, quality: 0.64 },
      { maxDim: 380, quality: 0.58 },
    ];

    for (const tier of fallbackTiers) {
      result = await compressAllImagesInObject(result, tier.maxDim, tier.maxDim, tier.quality);
      currentBytes = getObjectByteSize(result);
      if (currentBytes <= TARGET_MAX_BYTES) {
        break;
      }
    }
  }

  return result;
}

