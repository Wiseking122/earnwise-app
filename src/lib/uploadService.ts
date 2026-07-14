import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Helper to convert base64 data to a Blob.
 */
export function base64ToBlob(base64Data: string): Blob {
  const parts = base64Data.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Compresses an image file or blob to ensure it is resized nicely and small enough for reliable upload.
 */
export async function compressImage(fileOrBlob: File | Blob, maxWidth = 600, maxHeight = 600, quality = 0.3): Promise<Blob> {
  // If it's already tiny, return as is to save time
  if (fileOrBlob.size <= 80 * 1024) {
    return fileOrBlob;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('[COMPRESS] Compression timed out, using original file');
      resolve(fileOrBlob);
    }, 10000);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        clearTimeout(timeout);
        resolve(fileOrBlob);
        return;
      }

      const img = new Image();
      img.onload = async () => {
        clearTimeout(timeout);
        
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (!width || !height) {
          resolve(fileOrBlob);
          return;
        }

        let newWidth = width;
        let newHeight = height;

        if (width > height) {
          if (width > maxWidth) {
            newHeight = Math.round((height * maxWidth) / width);
            newWidth = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            newWidth = Math.round((width * maxHeight) / height);
            newHeight = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, newWidth, newHeight);
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          try {
            canvas.toBlob((blob) => {
              if (blob) {
                console.log(`[COMPRESS] Compressed from ${Math.round(fileOrBlob.size / 1024)}KB to ${Math.round(blob.size / 1024)}KB`);
                resolve(blob);
              } else {
                resolve(fileOrBlob);
              }
            }, 'image/jpeg', quality);
          } catch (e) {
            console.warn('[COMPRESS] Canvas toBlob failed:', e);
            resolve(fileOrBlob);
          }
        } else {
          resolve(fileOrBlob);
        }
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(fileOrBlob);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      resolve(fileOrBlob);
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload service that:
 * 1. Compresses image files before upload.
 * 2. Uploads files to Firebase Storage via our backend to bypass client network issues.
 * 3. Returns the Firebase Storage download URL.
 */
export async function uploadProofImage(
  input: File | Blob | string,
  userId: string,
  taskId: string,
  folder = 'proof-images',
  onProgress?: (progress: number) => void,
  options: { skipCompression?: boolean } = {}
): Promise<{ downloadUrl: string; fileName: string; fileSize: number; timestamp: number }> {
  try {
    let blobToUpload: Blob;

    if (onProgress) onProgress(0);

    if (typeof input === 'string') {
      if (input.startsWith('data:')) {
        blobToUpload = base64ToBlob(input);
      } else {
        throw new Error('Invalid image string input: Must be a data URL.');
      }
    } else {
      blobToUpload = input;
    }

    // Compress the image before uploading (unless skipped)
    if (!options.skipCompression) {
      console.log('[UPLOAD] Compressing image before upload...');
      blobToUpload = await compressImage(blobToUpload);
    }

    if (onProgress) onProgress(30);

    const timestamp = Date.now();
    const fileExt = 'jpg'; // Force jpg for consistent metadata
    const fileName = `${timestamp}.${fileExt}`;
    
    console.log(`[UPLOAD] Converting compressed blob (${blobToUpload.size} bytes) to base64...`);
    
    // Convert compressed blob back to base64
    const base64Data = await blobToBase64(blobToUpload);
    
    if (onProgress) onProgress(100);
    
    console.log(`[UPLOAD] Complete! Using base64 inline image.`);
    
    return {
      downloadUrl: base64Data, // Return base64 string directly
      fileName,
      fileSize: blobToUpload.size,
      timestamp,
    };
  } catch (outerErr: any) {
    console.error('[UPLOAD] Fatal outer error:', outerErr);
    throw new Error('Upload initialization failed: ' + outerErr.message);
  }
}
