import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotificationSettings } from "./notification-settings";
import { Bell } from "lucide-react";

interface NotificationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationSettingsModal({ isOpen, onClose }: NotificationSettingsModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-[#FAF9F7]/95 backdrop-blur-md border-[#E5F0EA] p-0 overflow-hidden gap-0">
                <DialogHeader className="px-6 py-4 border-b border-stone-100">
                    <DialogTitle className="flex items-center gap-2 text-stone-800 text-lg">
                        <Bell className="w-5 h-5 text-[#8B7355]" />
                        通知設定
                    </DialogTitle>
                </DialogHeader>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <NotificationSettings />
                </div>
            </DialogContent>
        </Dialog>
    );
}
