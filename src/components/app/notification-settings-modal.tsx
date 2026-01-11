import { createPortal } from "react-dom";
import { NotificationSettings } from "./notification-settings";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationSettingsModal({ isOpen, onClose }: NotificationSettingsModalProps) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10002] flex items-end justify-center sm:items-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="bg-[#FAF9F7]/90 backdrop-blur-xl border border-white/40 shadow-2xl w-full max-w-md max-h-[85vh] sm:rounded-2xl rounded-t-[32px] overflow-hidden flex flex-col relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-black/5 shrink-0 flex items-center justify-between z-10">
                            <div className="flex items-center gap-2 text-slate-800 text-lg font-bold">
                                <Bell className="w-5 h-5 text-[#E8B4A0]" />
                                通知設定
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-black/5 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200">
                            <NotificationSettings />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
