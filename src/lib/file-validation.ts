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
        requireExtensionMatch = true,
    } = options;

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `ファイル形式が対応していません: ${file.type}`,
        };
    }

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

    // Extract and validate extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = MIME_TO_EXTENSIONS[file.type] || [];

    if (requireExtensionMatch && !allowedExtensions.includes(ext)) {
        return {
            valid: false,
            error: `ファイル拡張子がMIMEタイプと一致しません`,
        };
    }

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
