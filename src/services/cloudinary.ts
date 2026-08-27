/**
 * Cloudinary Unsigned Image Upload Service for CBIT Campus Map
 * Cloud Name: r8yfhgh2
 * Upload Preset: cbit_uploads
 */

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
}

export const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'r8yfhgh2',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'cbit_uploads',
};

/**
 * Uploads an image file or base64 data to Cloudinary via unsigned upload preset.
 */
export async function uploadImageToCloudinary(
  fileOrData: File | Blob | string,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  const { cloudName, uploadPreset } = CLOUDINARY_CONFIG;
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const formData = new FormData();
  formData.append('file', fileOrData);
  formData.append('upload_preset', uploadPreset);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.secure_url) {
            resolve({
              secureUrl: res.secure_url,
              publicId: res.public_id,
              format: res.format,
              bytes: res.bytes,
              width: res.width,
              height: res.height,
            });
          } else {
            reject(new Error(res.error?.message || 'Upload succeeded but no secure_url returned.'));
          }
        } catch (err) {
          reject(new Error('Failed to parse Cloudinary response.'));
        }
      } else {
        try {
          const errorRes = JSON.parse(xhr.responseText);
          reject(new Error(errorRes.error?.message || `Cloudinary upload failed (HTTP ${xhr.status})`));
        } catch {
          reject(new Error(`Cloudinary upload failed with HTTP status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading proof to Cloudinary.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Cloudinary upload request timed out.'));
    };

    xhr.send(formData);
  });
}
