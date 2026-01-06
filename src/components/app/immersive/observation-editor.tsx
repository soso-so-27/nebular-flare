import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Image as ImageIcon, X, Save } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface ObservationEditorProps {
    notice: any; // Type NoticeDef ideally
    choices: string[];
    existingObs: any; // Type Observation ideally
    styles: any;
    onCancel: () => void;
    onSave: (value: string, note: string, files: File[]) => Promise<void>;
    triggerFeedback: (type: 'light' | 'medium' | 'success') => void;
}

export function ObservationEditor({
    notice,
    choices,
    existingObs,
    styles,
    onCancel,
    onSave,
    triggerFeedback
}: ObservationEditorProps) {
    const [selectedValue, setSelectedValue] = useState(existingObs?.value || (choices.length > 0 ? choices[0] : '撮影した')); // Default for photo type
    const [noteText, setNoteText] = useState(existingObs?.notes || "");
    const [files, setFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);

            const newUrls = newFiles.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newUrls]);
            triggerFeedback('medium');
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
        triggerFeedback('light');
    };

    const handleSave = async () => {
        if (!selectedValue) {
            toast.error("値を選択してください");
            return;
        }
        setIsSaving(true);
        try {
            await onSave(selectedValue, noteText, files);
        } catch (e) {
            console.error(e);
            toast.error("保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-2 p-2 rounded-lg bg-black/40 border border-white/20 backdrop-blur-md">
            <span className={`text-sm font-medium ${styles.text}`}>{notice.title}</span>

            {/* Choices */}
            {notice.inputType !== 'photo' && (
                <div className="flex gap-1.5 flex-wrap">
                    {choices.map((choice) => (
                        <button
                            key={choice}
                            onClick={() => {
                                triggerFeedback('light');
                                setSelectedValue(choice);
                            }}
                            className={`px-2 py-1 rounded text-xs font-bold border transition-all ${selectedValue === choice
                                ? 'bg-white text-black border-white'
                                : 'bg-transparent text-white/70 border-white/20 hover:bg-white/10'
                                }`}
                        >
                            {choice}
                        </button>
                    ))}
                </div>
            )}

            {/* Note Input */}
            <textarea
                className="w-full bg-black/20 border border-white/10 rounded p-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/40 resize-none h-16"
                placeholder="メモを入力..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
            />

            {/* Photo Attachment Section */}
            <div>
                <div className="flex gap-2 overflow-x-auto py-1">
                    {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden border border-white/20">
                            <Image src={url} alt="preview" fill className="object-cover" />
                            <button
                                onClick={() => removeFile(idx)}
                                className="absolute top-0 right-0 bg-black/50 text-white p-0.5 rounded-bl"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            triggerFeedback('medium');
                            fileInputRef.current?.click();
                        }}
                        className="w-12 h-12 flex items-center justify-center rounded border border-white/20 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors flex-shrink-0"
                    >
                        <Camera className="w-5 h-5" />
                    </button>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-1">
                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="p-1 px-2 text-xs text-white/60 hover:text-white disabled:opacity-50"
                >
                    キャンセル
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-xs font-bold transition-all disabled:opacity-50"
                >
                    {isSaving ? (
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save className="w-3 h-3" />
                    )}
                    {isSaving ? '保存中' : '保存'}
                </button>
            </div>
        </div>
    );
}
