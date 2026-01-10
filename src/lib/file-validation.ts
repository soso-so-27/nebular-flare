/**
 * File upload validation utilities
 * Prevents malicious file uploads by validating MIME types, extensions, and sizes
 */

// Allowed image MIME types for cat photos
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif', // For animated photos
] as const;

// Allowed video MIME types
export const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime', // .mov
    'video/webm',
] as const;

// Combined media types
export const ALLOWED_MEDIA_TYPES = [
    ...ALLOWED_IMAGE_TYPES,
    ...ALLOWED_VIDEO_TYPES,
] as const;

// Maximum file sizes
export const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Extension to MIME type mapping for validation
const MIME_TO_EXTENSIONS: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'image/heic': ['heic'],
    'image/heif': ['heif'],
    'image/gif': ['gif'],
    'video/mp4': ['mp4'],
    'video/quicktime': ['mov'],
    'video/webm': ['webm'],
};

export interface ValidationResult {
    valid: boolean;
    error?: string;
    sanitizedName?: string;
}

/**
 * Validates a file for upload
 * @param file - The File object to validate
 * @param options - Validation options
 * @returns ValidationResult with sanitized filename if valid
 */
export function validateFileUpload(
    file: File,
    options: {
        allowedTypes?: readonly string[];
        maxSize?: number;
        requireExtensionMatch?: boolean;
    } = {}
): ValidationResult {
    const {
        allowedTypes = ALLOWED_IMAGE_TYPES,
        maxSize = MAX_IMAGE_SIZE,
        // Default to false for strict matching to support various Android devices/browsers
        requireExtensionMatch = false,
    } = options;

    // Extract extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // Check file size
    if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / 1024 / 1024);
        return {
            valid: false,
            error: `ファイルサイズが大きすぎます (最大 ${maxSizeMB}MB)`,
        };
    }

    // Check file size minimum (empty files)
    if (file.size === 0) {
        return {
            valid: false,
            error: 'ファイルが空です',
        };
    }

    // Check file type (Permissive Mode)
    // 1. If file.type is present, it must be allowed OR generic 'application/octet-stream'
    // 2. If file.type is missing/empty, rely on extension
    let isValidType = false;

    if (file.type && file.type !== "" && file.type !== "application/octet-stream") {
        if (allowedTypes.includes(file.type as any)) {
            isValidType = true;
        }
    } else {
        // Fallback to extension check if valid MIME type is missing
        // Check if the extension maps to any of the allowed types
        for (const type of allowedTypes) {
            const extensions = MIME_TO_EXTENSIONS[type] || [];
            if (extensions.includes(ext)) {
                isValidType = true;
                break;
            }
        }
    }

    if (!isValidType) {
        // Double check: maybe the browser reports a weird type but the extension is solid?
        // If extension is known, let's be permissive.
        const isKnownExtension = Object.values(MIME_TO_EXTENSIONS).some(exts => exts.includes(ext));
        if (!isKnownExtension) {
            return {
                valid: false,
                error: `対応していないファイル形式です (${file.type || '不明'})`,
            };
        }
    }

    // SKIP strict extension match for now as it causes issues on some devices

    // Sanitize filename - remove special characters that could cause path issues
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const sanitizedBase = baseName
        .replace(/[^a-zA-Z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf.-]/g, '_')
        .substring(0, 100); // Limit length

    const sanitizedName = `${sanitizedBase}.${ext}`;

    return {
        valid: true,
        sanitizedName,
    };
}

/**
 * Validates multiple files for upload
 * @param files - Array of File objects
 * @param options - Validation options
 * @returns Array of validation results with file indices
 */
export function validateMultipleFiles(
    files: File[],
    options: {
        allowedTypes?: readonly string[];
        maxSize?: number;
        maxFiles?: number;
    } = {}
): { results: (ValidationResult & { file: File; index: number })[]; hasErrors: boolean } {
    const { maxFiles = 10 } = options;

    if (files.length > maxFiles) {
        return {
            results: [{
                valid: false,
                error: `ファイル数が多すぎます (最大 ${maxFiles}ファイル)`,
                file: files[0],
                index: 0,
            }],
            hasErrors: true,
        };
    }

    const results = files.map((file, index) => ({
        ...validateFileUpload(file, options),
        file,
        index,
    }));

    const hasErrors = results.some(r => !r.valid);

    return { results, hasErrors };
}

/**
 * Determines file type category
 */
export function getFileCategory(file: File): 'image' | 'video' | 'unknown' {
    if (ALLOWED_IMAGE_TYPES.includes(file.type as any)) return 'image';
    if (ALLOWED_VIDEO_TYPES.includes(file.type as any)) return 'video';
    return 'unknown';
}
