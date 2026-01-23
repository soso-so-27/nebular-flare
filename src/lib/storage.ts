/**
 * Shared Storage Utilities
 * 
 * Centralized image upload functionality to eliminate duplication
 * across use-supabase-data.ts and app-store.tsx
 */

import { createClient } from '@/lib/supabase';
import { storageLogger } from '@/lib/logger';
import { validateFileUpload, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from '@/lib/file-validation';

export interface UploadOptions {
    allowedTypes?: readonly string[];
    maxSize?: number;
    bucket?: string;
    cacheControl?: string;
}

export interface UploadResult {
    publicUrl: string | null;
    storagePath: string | null;
    error: string | null;
}

const DEFAULT_OPTIONS: Required<UploadOptions> = {
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
    maxSize: MAX_IMAGE_SIZE,
    bucket: 'cat-images',
    cacheControl: '3600',
};

/**
 * Generate a storage path for an uploaded file
 */
export function generateStoragePath(
    prefix: string,
    entityId: string,
    fileName: string
): string {
    const dateStr = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${prefix}/${entityId}/${dateStr}/${timestamp}-${cleanName}`;
}

/**
 * Upload a file to Supabase Storage with validation
 */
export async function uploadFile(
    storagePath: string,
    file: File,
    options: UploadOptions = {}
): Promise<UploadResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const supabase = createClient();

    // Validate file
    const validation = validateFileUpload(file, {
        allowedTypes: opts.allowedTypes,
        maxSize: opts.maxSize,
    });

    if (!validation.valid) {
        return { publicUrl: null, storagePath: null, error: validation.error || 'Validation failed' };
    }

    // Upload to storage
    const { error } = await supabase.storage.from(opts.bucket).upload(storagePath, file, {
        cacheControl: opts.cacheControl,
        upsert: false,
        contentType: file.type,
    });

    if (error) {
        storageLogger.error('Storage upload failed:', error);
        return { publicUrl: null, storagePath: null, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from(opts.bucket).getPublicUrl(storagePath);
    return { publicUrl, storagePath, error: null };
}

/**
 * Upload an image for a cat (convenience wrapper)
 */
export async function uploadCatImage(
    catId: string,
    file: File,
    options: Omit<UploadOptions, 'bucket'> = {}
): Promise<UploadResult> {
    const storagePath = generateStoragePath('cat-photos', catId, file.name);
    return uploadFile(storagePath, file, {
        ...options,
        bucket: 'cat-images',
        allowedTypes: options.allowedTypes || [...ALLOWED_IMAGE_TYPES],
        maxSize: options.maxSize || MAX_IMAGE_SIZE,
    });
}

/**
 * Upload a video for a cat (convenience wrapper)
 */
export async function uploadCatVideo(
    catId: string,
    file: File,
    options: Omit<UploadOptions, 'bucket'> = {}
): Promise<UploadResult> {
    const storagePath = generateStoragePath('cat-videos', catId, file.name);
    return uploadFile(storagePath, file, {
        ...options,
        bucket: 'cat-images', // Same bucket, different prefix
        allowedTypes: options.allowedTypes || [...ALLOWED_VIDEO_TYPES],
        maxSize: options.maxSize || MAX_VIDEO_SIZE,
    });
}

/**
 * Upload a user avatar
 */
export async function uploadUserAvatar(
    userId: string,
    file: File
): Promise<UploadResult> {
    const storagePath = generateStoragePath('avatars', userId, file.name);
    return uploadFile(storagePath, file, {
        bucket: 'avatars',
        allowedTypes: [...ALLOWED_IMAGE_TYPES],
        maxSize: MAX_IMAGE_SIZE,
    });
}

/**
 * Upload multiple images and return successful URLs
 */
export async function uploadMultipleImages(
    catId: string,
    files: File[]
): Promise<{ urls: string[]; errors: string[] }> {
    const results = await Promise.all(
        files.map(file => uploadCatImage(catId, file))
    );

    const urls: string[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
        if (result.publicUrl) {
            urls.push(result.publicUrl);
        } else if (result.error) {
            errors.push(`${files[index].name}: ${result.error}`);
        }
    });

    return { urls, errors };
}
