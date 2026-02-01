import { useState, useRef } from 'react';
import { useIncidentContext, useCatContext, useCoreContext } from '@/store/app-store';
import { toast } from "sonner";

export const TYPE_LABELS: Record<string, string> = {
    'daily': '記録',
    'worried': '相談',
    'chat': '相談',
    'log': '記録',
    'concerned': '相談',
    'troubled': '相談',
    'good': '記録',
    'vomit': '相談',
    'diarrhea': '相談',
    'injury': '相談',
    'appetite': '相談',
    'energy': '相談',
    'toilet': '相談',
    'other': '記録'
};

export const STATUS_OPTIONS = [
    { id: 'log', label: '記録', color: 'bg-slate-400' },
    { id: 'tracking', label: '追跡中', color: 'bg-brand-peach' },
    { id: 'resolved', label: '解決済み', color: 'bg-teal-500' },
];

export function useIncidentDetail(incidentId: string, onClose: () => void) {
    const {
        incidents,
        addIncidentUpdate,
        resolveIncident,
        addReaction,
        removeReaction,
        toggleBookmark
    } = useIncidentContext();
    const { cats } = useCatContext();
    const { currentUserId } = useCoreContext();

    const [loading, setLoading] = useState(false);
    const [updateNote, setUpdateNote] = useState('');
    const [statusChange, setStatusChange] = useState('no_change');
    const [photos, setPhotos] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [showUpdateForm, setShowUpdateForm] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const incident = incidents.find((inc: any) => inc.id === incidentId);
    const cat = incident ? cats.find((c: any) => c.id === incident.cat_id) : null;
    const typeLabel = incident ? (TYPE_LABELS[incident.type as keyof typeof TYPE_LABELS] || incident.type) : '';
    const statusOption = incident ? STATUS_OPTIONS.find(s => s.id === incident.status) : null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setPhotos(prev => [...prev, ...files]);

            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newPreviews]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddUpdate = async () => {
        if (!updateNote && photos.length === 0 && (statusChange === 'no_change' || !statusChange)) {
            toast.error("更新内容を入力してください");
            return;
        }

        setLoading(true);
        try {
            const { error } = await addIncidentUpdate(
                incidentId,
                updateNote,
                photos,
                (statusChange && statusChange !== 'no_change') ? statusChange : undefined
            );
            if (error) throw error;

            toast.success("更新を記録しました");
            setUpdateNote('');
            setStatusChange('no_change');
            setPhotos([]);
            setPreviewUrls([]);
            setShowUpdateForm(false);
        } catch (e) {
            console.error(e);
            toast.error("更新に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        setLoading(true);
        try {
            const { error } = await resolveIncident(incidentId);
            if (error) throw error;

            toast.success("解決済みにしました");
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("更新に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    return {
        incident,
        cat,
        typeLabel,
        statusOption,
        loading,
        updateNote,
        setUpdateNote,
        statusChange,
        setStatusChange,
        photos,
        previewUrls,
        showUpdateForm,
        setShowUpdateForm,
        fileInputRef,
        handleFileChange,
        removePhoto,
        handleAddUpdate,
        handleResolve,
        addReaction,
        removeReaction,
        toggleBookmark,
        currentUserId,
        STATUS_OPTIONS
    };
}
