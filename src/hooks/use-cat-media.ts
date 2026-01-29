"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { Cat } from "@/types";

export function useCatMedia(activeCat: Cat | undefined) {
    const [randomPhotoIndex, setRandomPhotoIndex] = useState(0);
    const lastPhotoSetRef = useRef<string>('');

    // Helper function to get public URL from avatars bucket
    const getPublicUrl = (path: string, options?: { width: number, quality: number }) => {
        const supabase = createClient();
        const { data } = supabase.storage.from('avatars').getPublicUrl(path, {
            transform: options ? {
                width: options.width,
                quality: options.quality,
                resize: 'cover',
            } : undefined
        });
        return data.publicUrl;
    };

    // Build array of all photos for the active cat
    const allPhotos = useMemo(() => {
        if (!activeCat) return [];
        const photos: string[] = [];
        if (activeCat.avatar) {
            photos.push(activeCat.avatar);
        }
        if (activeCat.images && activeCat.images.length > 0) {
            activeCat.images.forEach(img => {
                if (img.storagePath) {
                    const publicUrl = getPublicUrl(img.storagePath, { width: 1200, quality: 80 });
                    if (!photos.includes(publicUrl) && publicUrl !== activeCat.avatar) {
                        photos.push(publicUrl);
                    }
                }
            });
        }
        return photos;
    }, [activeCat]);

    useEffect(() => {
        if (allPhotos.length > 0 && activeCat) {
            const photoSetKey = `${activeCat.id}-${allPhotos.length}`;
            if (lastPhotoSetRef.current !== photoSetKey) {
                setRandomPhotoIndex(Math.floor(Math.random() * allPhotos.length));
                lastPhotoSetRef.current = photoSetKey;
            }
        }
    }, [activeCat?.id, allPhotos.length]);

    const randomPhotoUrl = allPhotos.length > 0
        ? allPhotos[randomPhotoIndex % allPhotos.length]
        : activeCat?.avatar || null;

    // Determine Display Media based on background_mode
    const bgMediaInfo = useMemo(() => {
        const mode = activeCat?.background_mode || 'random';

        if (mode === 'media' && activeCat && activeCat.background_media) {
            const isVid = /\.(mp4|webm|mov)$/i.test(activeCat.background_media);
            return { displayMedia: activeCat.background_media, isVideo: isVid };
        }

        if (mode === 'avatar') {
            return { displayMedia: activeCat?.avatar || null, isVideo: false };
        }

        return { displayMedia: randomPhotoUrl, isVideo: false };
    }, [activeCat, randomPhotoUrl]);

    return {
        ...bgMediaInfo,
        allPhotos,
        randomPhotoUrl
    };
}
