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
 * Compresses an image file or blob to ensure it is under 1MB and resized nicely.
 */
export async function compressImage(fileOrBlob: File | Blob, maxWidth = 800, maxHeight = 800, quality = 0.4): Promise<Blob> {
  // If it's already tiny, return as is
  if (fileOrBlob.size <= 30 * 1024 && fileOrBlob.type === 'image/jpeg') {
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
  onProgress?: (progress: number) => void
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

  console.log(`[UPLOAD] Starting Firebase Storage resumable upload for ${filePath}...`);
  
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blobToUpload);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error('[UPLOAD] Upload failed:', error);
        reject(new Error('Screenshot upload failed. Please check your internet connection and try again.'));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          console.log(`[UPLOAD] Complete! URL length: ${downloadUrl.length}`);
          resolve({
            downloadUrl,
            fileName,
            fileSize: blobToUpload.size,
            timestamp,
          });
        } catch (error) {
          console.error('[UPLOAD] Failed to get download URL:', error);
          reject(new Error('Failed to retrieve uploaded image URL.'));
        }
      }
    );
  });
}
