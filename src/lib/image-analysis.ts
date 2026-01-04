/**
 * Analyzes the brightness of an image and determines if it's "light" or "dark".
 * Used to adjust UI contrast (e.g., changing white text to black on bright backgrounds).
 * 
 * @param imageSrc The source URL of the image to analyze
 * @returns Promise resolving to 'light' or 'dark'
 */
export const analyzeImageBrightness = (imageSrc: string): Promise<'light' | 'dark'> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageSrc;

        img.onload = () => {
            // Create a small canvas to analyze average color
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve('dark'); // Default fallback
                return;
            }

            // Resize to highly simplified thumbnail for speed (50x50 is plenty)
            canvas.width = 50;
            canvas.height = 50;

            // Draw image to canvas
            ctx.drawImage(img, 0, 0, 50, 50);

            // Get pixel data
            const imageData = ctx.getImageData(0, 0, 50, 50);
            const data = imageData.data;

            let r, g, b, avg;
            let colorSum = 0;

            // Calculate simple average luminance
            // Loop over pixels (data is [r, g, b, a, r, g, b, a, ...])
            for (let x = 0, len = data.length; x < len; x += 4) {
                r = data[x];
                g = data[x + 1];
                b = data[x + 2];

                // Standard luminance formula: 0.2126 R + 0.7152 G + 0.0722 B
                // Simplified roughly: (r+g+b)/3 is often enough for UI toggle, but let's be slightly precise
                avg = Math.floor((r + g + b) / 3);
                colorSum += avg;
            }

            const brightness = Math.floor(colorSum / (50 * 50));

            // Threshold: 0 (Black) to 255 (White)
            // > 180 is reasonably "bright" where white text becomes hard to read
            // We can tune this. Let's start with 180.
            if (brightness > 160) {
                resolve('light');
            } else {
                resolve('dark');
            }
        };

        img.onerror = () => {
            // Fallback on error
            resolve('dark');
        };
    });
};
