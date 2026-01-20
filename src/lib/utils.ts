import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { createClient } from '@/lib/supabase';

export const getFullImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  // Determine bucket based on path content
  let bucket = 'avatars';
  if (path.includes('cat-photos') || path.includes('cat-videos') || path.includes('incident_updates')) {
    bucket = 'cat-images';
  }

  const supabase = createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
