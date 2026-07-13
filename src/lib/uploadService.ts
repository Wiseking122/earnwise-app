import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
 * Compresses an image file or blob to ensure it is under 1MB and resized nicely.
 */
export async function compressImage(fileOrBlob: File | Blob, maxWidth = 1000, maxHeight = 1000, quality = 0.5): Promise<Blob> {
  // If it's already very small, we can skip processing, but for proofs
  // we usually want to normalize them to JPEG anyway.
  if (fileOrBlob.size <= 50 * 1024 && fileOrBlob.type === 'image/jpeg') {
    return fileOrBlob;
  }

  return new Promise((resolve) => {
    // Add a safety timeout for compression
    const timeout = setTimeout(() => {
      console.warn('[COMPRESS] Compression timed out, using original file');
      resolve(fileOrBlob);
    }, 5000);

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
        try {
          if ('decode' in img) {
            await img.decode();
          }
        } catch (e) {
          console.warn('[COMPRESS] Image decode failed:', e);
        }

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
          // Always use white background for transparency conversion
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, newWidth, newHeight);
          
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          try {
            // ALWAYS use image/jpeg for proofs to ensure maximum compression and no transparency issues
            const outputType = 'image/jpeg';
            canvas.toBlob((blob) => {
              if (blob) {
                // Final check: if it's still too big (shouldn't happen with 1000px @ 0.5 quality),
                // we could recursively compress, but 0.5 is usually very aggressive.
                resolve(blob);
              } else {
                resolve(fileOrBlob);
              }
            }, outputType, quality);
          } catch (e) {
            console.warn('[COMPRESS] Canvas toBlob failed, using fallback:', e);
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

/**
 * Upload service that:
 * 1. Compresses image files before upload (maximum 1 MB if needed).
 * 2. Uploads files to proof-images/{userId}/{taskId}/{timestamp}.jpg (or custom folder).
 * 3. Returns the Firebase Storage download URL.
 */
export async function uploadProofImage(
  input: File | Blob | string,
  userId: string,
  taskId: string,
  folder = 'proof-images',
  maxRetries = 2
): Promise<{ downloadUrl: string; fileName: string; fileSize: number; timestamp: number }> {
  let blobToUpload: Blob;

  if (typeof input === 'string') {
    // If it's a base64 string, convert to blob first
    if (input.startsWith('data:')) {
      blobToUpload = base64ToBlob(input);
    } else {
      throw new Error('Invalid image string input: Must be a data URL.');
    }
  } else {
    blobToUpload = input;
  }

  // Compress the image before uploading
  blobToUpload = await compressImage(blobToUpload);

  const timestamp = Date.now();
  const fileExt = blobToUpload.type === 'image/png' ? 'png' : 'jpg';
  const fileName = `${timestamp}.${fileExt}`;
  const filePath = `${folder}/${userId}/${taskId}/${fileName}`;

  const storageRef = ref(storage, filePath);

  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      // Use Promise.race to force a timeout in case Firebase hangs
      const uploadPromise = async () => {
        console.log(`[UPLOAD] Starting Firebase Storage upload for ${filePath}...`);
        const snapshot = await uploadBytes(storageRef, blobToUpload);
        console.log(`[UPLOAD] Upload successful, getting download URL...`);
        return await getDownloadURL(snapshot.ref);
      };
      
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Firebase Storage upload timed out')), 30000);
      });
      
      const downloadUrl = await Promise.race([uploadPromise(), timeoutPromise]);
      
      console.log(`[UPLOAD] Complete! URL length: ${downloadUrl.length}`);
      return {
        downloadUrl,
        fileName,
        fileSize: blobToUpload.size,
        timestamp,
      };
    } catch (error) {
      attempt++;
      console.error(`Upload attempt ${attempt} failed:`, error);
      if (attempt >= maxRetries) {
        // DO NOT fallback to base64 for large proofs as it breaks Firestore 1MB limit.
        // Instead, throw a clear error so the user knows they need to try again or check connection.
        throw new Error('Screenshot upload failed. Please check your internet connection and try again. (Storage Error)');
      }
      // Linear backoff: wait 1s before retry
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error('Upload failed unexpectedly.');
}
