import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F7]">
            <Loader2 className="h-8 w-8 animate-spin text-[#7CAA8E]" />
            <p className="text-sm font-medium text-[#7CAA8E]/80 mt-4 animate-pulse">読み込み中...</p>
        </div>
    );
}
