import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { createClient } from '@/lib/supabase';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  quality?: number;
}

export const getFullImageUrl = (path: string, options?: ImageTransformOptions) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;

  // Determine bucket based on path content
  let bucket = 'avatars';
  const catImagePrefixes = ['cat-photos', 'cat-videos', 'incident_updates', 'incidents', 'incoming'];
  if (catImagePrefixes.some(p => path.includes(p))) {
    bucket = 'cat-images';
  }

  const supabase = createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path, options ? { transform: options } : undefined);
  return data.publicUrl;
};
