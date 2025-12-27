import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { requestFcmToken } from '@/lib/firebase';
import { toast } from 'sonner';
import { usePushToken } from '@/hooks/use-supabase-data';

export function NotificationSettings() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const { saveToken } = usePushToken();

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const perm = Notification.permission;
            setPermission(perm);

            // If already granted, sync token to server
            if (perm === 'granted') {
                requestFcmToken().then(async (currentToken) => {
                    if (currentToken) {
                        setToken(currentToken);
                        await saveToken(currentToken);
                        console.log('Token synced to server');
                    }
                });
            }
        }
    }, []);

    const handleEnable = async () => {
        setLoading(true);
        try {
            const currentToken = await requestFcmToken();
            if (currentToken) {
                setToken(currentToken);
                await saveToken(currentToken); // Call saveToken here
                setPermission('granted');
                toast.success('通知設定が完了しました！'); // Updated toast message
                console.log('FCM Token:', currentToken);
            } else {
                toast.error('通知トークンの取得に失敗しました'); // Updated toast message
            }
        } catch (error) {
            console.error(error);
            toast.error('設定中にエラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const handleTestNotification = () => {
        // Send a test notification via Service Worker immediately
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'TEST_NOTIFICATION',
                title: 'CatUp テスト通知',
                body: '通知機能は正常に動作しています！🐱'
            });
        }
    };

    if (permission === 'granted') {
        return (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                        <Bell className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-emerald-900 text-sm">通知はオンです</h3>
                        <p className="text-xs text-emerald-700">お世話の時間にお知らせします</p>
                    </div>
                </div>
                {/* <button onClick={handleTestNotification} className="text-xs text-emerald-600 underline">テスト</button> */}
            </div>
        );
    }

    if (permission === 'denied') {
        return (
            <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
                    <BellOff className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="font-bold text-red-900 text-sm mb-2">通知が許可されていません</h3>
                        <p className="text-xs text-red-700 mb-3 leading-relaxed">
                            ブラウザまたはデバイスの設定で通知がブロックされています。
                            以下の手順で許可設定をお願いします。
                        </p>

                        <div className="text-xs bg-white/60 p-3 rounded-lg border border-red-200/50 space-y-3 text-red-900">
                            <div>
                                <p className="font-bold mb-1">📱 iPhone / iPad の場合</p>
                                <ul className="list-disc pl-4 space-y-1 opacity-80">
                                    <li><span className="font-bold text-red-700">重要:</span> ホーム画面に追加しないと詳細設定が表示されない場合があります。</li>
                                    <li>Safariの「共有」→「ホーム画面に追加」を行い、そこからアプリを起動し直してください。</li>
                                    <li>すでにホーム画面アプリの場合は、iOSの「設定」→「通知」→「CatUp」から許可してください。</li>
                                </ul>
                            </div>

                            <div>
                                <p className="font-bold mb-1">💻 パソコン (Chrome/Edge) の場合</p>
                                <ul className="list-disc pl-4 space-y-0.5 opacity-80">
                                    <li>画面上部のURLバー左側にある 🔒 鍵アイコンをクリック</li>
                                    <li>「権限」または「通知」の設定を探す</li>
                                    <li>スイッチをオンにする（または「許可」を選択）</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => window.location.reload()}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold border border-slate-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <Loader2 className="w-4 h-4" />
                        <span>再読み込み</span>
                    </button>
                    <button
                        onClick={handleEnable}
                        disabled={loading}
                        className="py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-sm font-bold border border-red-200 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                        <span>許可を再試行</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <Bell className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">通知を受け取る</h3>
                    <p className="text-xs text-slate-500">お世話の忘れ防止に役立ちます</p>
                </div>
            </div>
            <button
                onClick={handleEnable}
                disabled={loading}
                className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                通知をオンにする
            </button>
        </div>
    );
}
