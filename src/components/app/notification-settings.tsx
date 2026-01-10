import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, Camera, AlertTriangle, Package, Calendar } from 'lucide-react';
import { requestFcmToken } from '@/lib/firebase';
import { toast } from 'sonner';
import { usePushToken, useNotificationPreferences } from '@/hooks/use-supabase-data';
import { notificationLogger } from '@/lib/logger';

export function NotificationSettings() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [swReady, setSwReady] = useState(false);
    const { saveToken } = usePushToken();

    useEffect(() => {
        // Wait for Service Worker to be ready before allowing notification setup
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(() => {
                notificationLogger.debug('Service Worker is ready');
                setSwReady(true);
            }).catch((err) => {
                notificationLogger.error('Service Worker failed:', err);
            });
        } else {
            // No SW support, allow anyway (will fail later with better error)
            setSwReady(true);
        }

        if (typeof window !== 'undefined' && 'Notification' in window) {
            const perm = Notification.permission;
            setPermission(perm);

            // If already granted, sync token to server
            if (perm === 'granted') {
                requestFcmToken().then(async (currentToken) => {
                    if (currentToken) {
                        setToken(currentToken);
                        await saveToken(currentToken);
                        notificationLogger.debug('Token synced to server');
                    }
                });
            }
        }
    }, []);

    const handleEnable = async () => {
        setLoading(true);
        try {
            notificationLogger.debug('Starting handleEnable...');
            const currentToken = await requestFcmToken();

            if (currentToken) {
                notificationLogger.debug('Token received, saving to server...');
                setToken(currentToken);

                const result = await saveToken(currentToken);

                if (result.error) {
                    notificationLogger.error('saveToken failed:', result.error);
                    toast.error('トークンの保存に失敗しました');
                    return; // Don't mark as granted if save failed
                }

                notificationLogger.debug('Token saved successfully');
                setPermission('granted');
                toast.success('通知設定が完了しました！');
            } else {
                notificationLogger.error('No token received from requestFcmToken');
                toast.error('通知トークンの取得に失敗しました');
            }
        } catch (error) {
            notificationLogger.error('handleEnable error:', error);
            toast.error('通知の設定に失敗しました');
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

    const { preferences, loading: prefsLoading, updatePreference } = useNotificationPreferences();

    const handleToggle = (key: 'care_reminder' | 'health_alert' | 'inventory_alert' | 'photo_alert') => {
        updatePreference(key, !preferences[key]);
    };

    if (permission === 'granted') {
        return (
            <div className="space-y-4">
                <div className="p-4 bg-[#F2F7F4] rounded-xl border border-[#E5F0EA] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#E5F0EA] rounded-full text-[#5A8C6E]">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-emerald-900 text-sm">通知はオンです</h3>
                            <p className="text-xs text-[#487058]">最新の情報をお届けします</p>
                        </div>
                    </div>
                </div>

                {/* Settings Toggles */}
                {prefsLoading ? (
                    <div className="p-8 text-center text-stone-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </div>
                ) : (
                    <div className="p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm space-y-5">
                        <h4 className="text-sm font-bold text-stone-700 ml-1">受け取る通知</h4>

                        <div className="space-y-4">
                            {/* Physical Condition / Notice */}
                            <div className="flex items-center justify-between group">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1.5 bg-orange-100 rounded-lg text-orange-600">
                                        <AlertTriangle className="w-4 h-4" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-bold text-stone-700 group-hover:text-stone-900 transition-colors">体調・気付き</span>
                                        <p className="text-xs text-stone-500">嘔吐や食欲不振、気になる様子の記録</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('health_alert')}
                                    className={`w-11 h-6 rounded-full transition-all duration-300 relative ${preferences.health_alert ? 'bg-[#FF9F88] shadow-[0_0_8px_rgba(255,159,136,0.4)]' : 'bg-stone-200'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow-sm ${preferences.health_alert ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Today's Photo */}
                            <div className="flex items-center justify-between group">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1.5 bg-sky-100 rounded-lg text-sky-600">
                                        <Camera className="w-4 h-4" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-bold text-stone-700 group-hover:text-stone-900 transition-colors">今日の一枚</span>
                                        <p className="text-xs text-stone-500">家族がアップロードした新しい写真</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('photo_alert')}
                                    className={`w-11 h-6 rounded-full transition-all duration-300 relative ${preferences.photo_alert !== false ? 'bg-[#88C6FF] shadow-[0_0_8px_rgba(136,198,255,0.4)]' : 'bg-stone-200'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow-sm ${preferences.photo_alert !== false ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Inventory Alert */}
                            <div className="flex items-center justify-between group">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1.5 bg-yellow-100 rounded-lg text-yellow-600">
                                        <Package className="w-4 h-4" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-bold text-stone-700 group-hover:text-stone-900 transition-colors">在庫アラート</span>
                                        <p className="text-xs text-stone-500">フードや猫砂の補充タイミング</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('inventory_alert')}
                                    className={`w-11 h-6 rounded-full transition-all duration-300 relative ${preferences.inventory_alert !== false ? 'bg-[#FFCC4D] shadow-[0_0_8px_rgba(255,204,77,0.4)]' : 'bg-stone-200'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow-sm ${preferences.inventory_alert !== false ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Care Reminder */}
                            <div className="flex items-center justify-between group">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-bold text-stone-700 group-hover:text-stone-900 transition-colors">お世話リマインダー</span>
                                        <p className="text-xs text-stone-500">ごはんやトイレ掃除の忘れ防止</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('care_reminder')}
                                    className={`w-11 h-6 rounded-full transition-all duration-300 relative ${preferences.care_reminder ? 'bg-[#7CAA8E] shadow-[0_0_8px_rgba(124,170,142,0.4)]' : 'bg-stone-200'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow-sm ${preferences.care_reminder ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-stone-100">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-sm font-bold text-stone-700">通知時間</span>
                                    <p className="text-xs text-stone-500">毎日この時間にお知らせ</p>
                                </div>
                                <select
                                    value={preferences.notification_hour ?? 20}
                                    onChange={(e) => updatePreference('notification_hour', parseInt(e.target.value))}
                                    className="px-3 py-1.5 text-sm bg-stone-100 rounded-lg border-none focus:ring-2 focus:ring-[#7CAA8E] text-stone-700 cursor-pointer"
                                >
                                    <option value={-1}>指定なし</option>
                                    <option value={8}>朝 8:00</option>
                                    <option value={20}>夜 20:00</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
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
                        className="py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-sm font-bold border border-stone-200 transition-colors flex items-center justify-center gap-2"
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
        <div className="p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <Bell className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-stone-800 text-sm">通知を受け取る</h3>
                    <p className="text-xs text-stone-500">お世話の忘れ防止に役立ちます</p>
                </div>
            </div>
            <button
                onClick={handleEnable}
                disabled={loading || !swReady}
                className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {(loading || !swReady) && <Loader2 className="w-4 h-4 animate-spin" />}
                {!swReady ? '準備中...' : '通知をオンにする'}
            </button>
        </div>
    );
}
