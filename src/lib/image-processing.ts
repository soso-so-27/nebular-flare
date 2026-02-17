/**
 * Client-side image processing utilities for optimizing uploads.
 */

export interface ResizeOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'image/jpeg' | 'image/webp';
}

/**
 * Resizes an image file and returns a new File object.
 */
export async function resizeImage(
    file: File,
    options: ResizeOptions = {}
): Promise<File> {
    const {
        maxWidth = 1200,
        maxHeight = 1200,
        quality = 0.8,
        format = 'image/jpeg'
    } = options;

    // Skip if not an image
    if (!file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;

        img.onload = () => {
            URL.revokeObjectURL(url); // Clean up
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calculate aspect ratio
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas Context Error'));
                return;
            }

            // Draw and resize
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Canvas toBlob failed'));
                        return;
                    }
                    // Preserve the original name but potentially change extension if format changed
                    const name = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                    const ext = format === 'image/webp' ? 'webp' : 'jpg';
                    const resizedFile = new File([blob], `${name}.${ext}`, {
                        type: format,
                        lastModified: Date.now(),
                    });
                    resolve(resizedFile);
                },
                format,
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load image (${file.type}): ${file.name}`));
        };
    });
}
