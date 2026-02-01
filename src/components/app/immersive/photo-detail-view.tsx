"use client";

import React from "react";
import { useCatContext } from "@/store/app-store";
import { ImmersivePhotoView } from "./ImmersivePhotoView";
import { Cat } from "@/types";

interface PhotoTag {
    name: string;
    isAi: boolean;
    confirmed: boolean;
}

interface PhotoDetailViewProps {
    isOpen: boolean;
    onClose: () => void;
    image: {
        id: string;
        url: string;
        catName: string;
        catIds?: string[];
        createdAt: string;
        source: string;
        memo?: string;
        uploaderName?: string;
        tags?: PhotoTag[];
    } | null;
    onDelete?: (id: string) => void;
    onUpdateTags?: (id: string, tags: PhotoTag[]) => Promise<void>;
}

export function PhotoDetailView({ isOpen, onClose, image, onDelete, onUpdateTags }: PhotoDetailViewProps) {
    const { cats } = useCatContext();

    if (!image) return null;

    // Resolve cat names if multiple catIds present
    const resolvedCatName = image.catIds && image.catIds.length > 0
        ? image.catIds.map(id => (cats as Cat[]).find((c: Cat) => c.id === id)?.name).filter(Boolean).join(' & ')
        : image.catName;

    const resolvedCatAvatar = image.catIds && image.catIds.length === 1
        ? (cats as Cat[]).find((c: Cat) => c.id === image.catIds![0])?.avatar
        : undefined;

    return (
        <ImmersivePhotoView
            isOpen={isOpen}
            onClose={onClose}
            image={{
                ...image,
                catName: resolvedCatName,
                catAvatar: resolvedCatAvatar,
                url: image.url.replace('&width=300&height=300&resize=cover', '') // High res
            }}
            onDelete={onDelete}
            onUpdateTags={onUpdateTags as any}
        />
    );
}
