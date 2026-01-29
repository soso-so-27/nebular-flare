"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useAppState } from "@/store/app-store";
import { toast } from "sonner";
import { Cat } from "@/types";

export function useCatForm() {
    const supabase = createClient() as any;
    const { householdId, isDemo, refetchCats, addCatWeightRecord } = useAppState();

    const [isLoading, setIsLoading] = useState(false);
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');

    // Basic Info
    const [name, setName] = useState("");
    const [birthday, setBirthday] = useState("");
    const [sex, setSex] = useState("オス");
    const [weight, setWeight] = useState("");
    const [avatar, setAvatar] = useState("🐈");

    // Photos
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    // Background Media
    const [backgroundMode, setBackgroundMode] = useState<'avatar' | 'media' | 'random'>('random');
    const [backgroundMedia, setBackgroundMedia] = useState<string | null>(null);
    const [bgFile, setBgFile] = useState<File | null>(null);
    const [bgPreview, setBgPreview] = useState<string | null>(null);

    // Medical Profile
    const [neuteredStatus, setNeuteredStatus] = useState<'unknown' | 'neutered' | 'not_neutered' | 'intact'>('unknown');
    const [livingEnvironment, setLivingEnvironment] = useState<'indoor' | 'outdoor' | 'both'>('indoor');
    const [fleaTickDate, setFleaTickDate] = useState("");
    const [fleaTickProduct, setFleaTickProduct] = useState("");
    const [dewormingDate, setDewormingDate] = useState("");
    const [dewormingProduct, setDewormingProduct] = useState("");
    const [heartwormDate, setHeartwormDate] = useState("");
    const [heartwormProduct, setHeartwormProduct] = useState("");
    const [lastVaccineDate, setLastVaccineDate] = useState("");
    const [vaccineType, setVaccineType] = useState("");

    const resetForm = () => {
        setEditingCatId(null);
        setName("");
        setBirthday("");
        setSex("オス");
        setWeight("");
        setAvatar("🐈");
        setSelectedFiles([]);
        setPreviewUrls([]);
        setBackgroundMode('random');
        setBackgroundMedia(null);
        setBgFile(null);
        setBgPreview(null);
        setNeuteredStatus('unknown');
        setLivingEnvironment('indoor');
        setFleaTickDate("");
        setFleaTickProduct("");
        setDewormingDate("");
        setDewormingProduct("");
        setHeartwormDate("");
        setHeartwormProduct("");
        setLastVaccineDate("");
        setVaccineType("");
    };

    const uploadFiles = async (catId: string) => {
        if (selectedFiles.length === 0) return { firstPublicUrl: null };
        const results = [];
        for (const file of selectedFiles) {
            const ext = file.name.split('.').pop();
            const fileName = `${catId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const { error } = await supabase.storage.from("avatars").upload(fileName, file);
            if (!error) {
                const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
                results.push({ storagePath: fileName, publicUrl: data.publicUrl });
                await supabase.from("cat_images" as any).insert({ cat_id: catId, storage_path: fileName });
            }
        }
        return { firstPublicUrl: results[0]?.publicUrl || null };
    };

    const uploadBgMedia = async (catId: string) => {
        if (!bgFile) return null;
        const ext = bgFile.name.split('.').pop();
        const fileName = `${catId}/bg_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(fileName, bgFile);
        if (error) throw error;
        const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSubmit = async (onDone: () => void) => {
        if (!name.trim()) { toast.error("名前を入力してください"); return; }
        if (isDemo && !editingCatId) { toast.error("デモモードでは保存できません"); return; }
        if (!householdId) { toast.error("世帯IDがありません"); return; }

        setIsLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const user = userData.user;
            let currentCatId = editingCatId;

            if (!currentCatId) {
                const parsedWeight = weight ? parseFloat(weight) : null;
                const { data: newCat, error } = await supabase.from("cats").insert({
                    household_id: householdId,
                    name: name.trim(),
                    sex,
                    birthday: birthday || null,
                    weight: parsedWeight,
                    avatar: "🐈",
                    created_by: user?.id,
                } as any).select().single();
                if (error) throw error;
                currentCatId = newCat.id; // Type assertion handled by 'as any' above if needed, but newCat usually has id
                if (parsedWeight && currentCatId) await addCatWeightRecord(currentCatId, parsedWeight, "初期登録");
            }

            let newAvatarUrl = null;
            if (selectedFiles.length > 0 && currentCatId) {
                const { firstPublicUrl } = await uploadFiles(currentCatId);
                newAvatarUrl = firstPublicUrl;
            }

            let newBgMediaUrl = backgroundMedia;
            if (bgFile && currentCatId) {
                const uploadedBg = await uploadBgMedia(currentCatId);
                if (uploadedBg) newBgMediaUrl = uploadedBg;
            }

            if (currentCatId) {
                const updates: any = {
                    name: name.trim(),
                    sex,
                    birthday: birthday || null,
                    background_mode: backgroundMode,
                    background_media: newBgMediaUrl,
                    neutered_status: neuteredStatus,
                    living_environment: livingEnvironment,
                    flea_tick_date: fleaTickDate || null,
                    flea_tick_product: fleaTickProduct || null,
                    deworming_date: dewormingDate || null,
                    deworming_product: dewormingProduct || null,
                    heartworm_date: heartwormDate || null,
                    heartworm_product: heartwormProduct || null,
                    last_vaccine_date: lastVaccineDate || null,
                    vaccine_type: vaccineType || null,
                };
                if (newAvatarUrl) updates.avatar = newAvatarUrl;

                const { error } = await supabase.from("cats").update(updates).eq('id', currentCatId);
                if (error) throw error;
            }

            toast.success(editingCatId ? "更新しました" : "追加しました");
            refetchCats();
            resetForm();
            onDone();
        } catch (err: any) {
            console.error("Error saving cat:", err);
            toast.error(`保存失敗: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (catId: string, catName: string) => {
        if (!confirm(`${catName}を削除しますか？`)) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.from("cats").update({ deleted_at: new Date().toISOString() }).eq("id", catId);
            if (error) throw error;
            toast.success(`${catName}を削除しました`);
            refetchCats();
        } catch (err: any) {
            toast.error("削除に失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    const startEdit = (cat: Cat) => {
        setEditingCatId(cat.id);
        setName(cat.name);
        setBirthday(cat.birthday || "");
        setSex(cat.sex || "オス");
        setWeight(cat.weight ? String(cat.weight) : "");
        setAvatar(cat.avatar || "🐈");
        setSelectedFiles([]);
        setPreviewUrls([]);
        setBackgroundMode(cat.background_mode || 'random');
        setBackgroundMedia(cat.background_media || null);
        setBgFile(null);
        setBgPreview(cat.background_media || null);
        setNeuteredStatus((cat.neutered_status as any) || 'unknown');
        setLivingEnvironment(cat.living_environment || 'indoor');
        setFleaTickDate(cat.flea_tick_date ? cat.flea_tick_date.split('T')[0] : "");
        setFleaTickProduct(cat.flea_tick_product || "");
        setDewormingDate(cat.deworming_date ? cat.deworming_date.split('T')[0] : "");
        setDewormingProduct(cat.deworming_product || "");
        setHeartwormDate(cat.heartworm_date ? cat.heartworm_date.split('T')[0] : "");
        setHeartwormProduct(cat.heartworm_product || "");
        setLastVaccineDate(cat.last_vaccine_date ? cat.last_vaccine_date.split('T')[0] : "");
        setVaccineType(cat.vaccine_type || "");
        setViewMode('form');
    };

    const startAdd = () => {
        resetForm();
        setViewMode('form');
    };

    return {
        isLoading, viewMode, setViewMode, editingCatId,
        form: {
            name, setName, birthday, setBirthday, sex, setSex, weight, setWeight, avatar, setAvatar,
            selectedFiles, setSelectedFiles, previewUrls, setPreviewUrls,
            backgroundMode, setBackgroundMode, backgroundMedia, setBackgroundMedia,
            bgFile, setBgFile, bgPreview, setBgPreview,
            neuteredStatus, setNeuteredStatus, livingEnvironment, setLivingEnvironment,
            fleaTickDate, setFleaTickDate, fleaTickProduct, setFleaTickProduct,
            dewormingDate, setDewormingDate, dewormingProduct, setDewormingProduct,
            heartwormDate, setHeartwormDate, heartwormProduct, setHeartwormProduct,
            lastVaccineDate, setLastVaccineDate, vaccineType, setVaccineType
        },
        resetForm, handleSubmit, handleDelete, startEdit, startAdd
    };
}
