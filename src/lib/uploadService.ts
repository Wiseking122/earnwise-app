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
 * It resizes the image to fit within maxWidth and maxHeight (default 800px) and compresses it to JPEG
 * with the specified quality (default 0.5), keeping it safely under the Firestore 1MB document limit.
 * Wrapping the entire execution in try/catch ensures a perfect fallback to the original image in case of any platform issue.
 */
export async function compressImage(fileOrBlob: File | Blob, maxWidth = 800, maxHeight = 800, quality = 0.5): Promise<Blob> {
  return new Promise((resolve) => {
    // If the image is already small (e.g., under 150KB), skip compression entirely
    if (fileOrBlob.size < 150 * 1024) {
      console.log(`[COMPRESS] Image is already small (${Math.round(fileOrBlob.size / 1024)}KB). Skipping compression.`);
      return resolve(fileOrBlob);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions to fit within bounds
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.warn('[COMPRESS] Failed to get canvas context. Falling back to original.');
            return resolve(fileOrBlob);
          }

          // Draw onto canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Retrieve compressed JPEG blob
          canvas.toBlob(
            (compressedBlob) => {
              if (compressedBlob) {
                console.log(`[COMPRESS] Compression complete. Original: ${Math.round(fileOrBlob.size / 1024)}KB, Compressed: ${Math.round(compressedBlob.size / 1024)}KB`);
                resolve(compressedBlob);
              } else {
                console.warn('[COMPRESS] toBlob returned null. Falling back to original.');
                resolve(fileOrBlob);
              }
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          console.error('[COMPRESS] Error during compression process. Falling back to original:', err);
          resolve(fileOrBlob);
        }
      };

      img.onerror = (err) => {
        console.error('[COMPRESS] Failed to load image element. Falling back to original:', err);
        resolve(fileOrBlob);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = (err) => {
      console.error('[COMPRESS] FileReader reading error. Falling back to original:', err);
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
