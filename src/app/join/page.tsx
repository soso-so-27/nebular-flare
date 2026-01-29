import React, { Suspense } from 'react';
import { JoinScreen } from '@/components/app/screens/join-screen';
import { Loader2 } from 'lucide-react';

export const metadata = {
    title: '家族に参加 - にゃるほど',
    description: 'ねこの足あとアプリ「にゃるほど」の招待を受け取る',
};

export default function JoinPage() {
    return (
        <Suspense fallback={
            <div className="min-h-full flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-[#7CAA8E]" />
            </div>
        }>
            <JoinScreen />
        </Suspense>
    );
}
