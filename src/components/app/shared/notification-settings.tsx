import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, MessageCircle, AlertTriangle, Package, Calendar } from 'lucide-react';
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
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(() => {
                setSwReady(true);
            }).catch((err) => {
                notificationLogger.error('Service Worker failed:', err);
                setSwReady(true); // Recovery
            });
        } else {
            setSwReady(true);
        }

        if (typeof window !== 'undefined' && 'Notification' in window) {
            const perm = Notification.permission;
            setPermission(perm);
            if (perm === 'granted') {
                requestFcmToken().then(async (currentToken) => {
                    if (currentToken) {
                        setToken(currentToken);
                        await saveToken(currentToken);
                    }
                });
            }
        }
    }, [saveToken]);

    const handleEnable = async () => {
        setLoading(true);
        try {
            const currentToken = await requestFcmToken();
            if (currentToken) {
                setToken(currentToken);
                const result = await saveToken(currentToken);
                if (result.error) {
                    toast.error('トークンの保存に失敗しました');
                    return;
                }
                setPermission('granted');
                toast.success('通知設定が完了しました！');
            } else {
                toast.error('通知トークンの取得に失敗しました');
            }
        } catch (error) {
            toast.error('通知の設定に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const { preferences, loading: prefsLoading, updatePreference } = useNotificationPreferences();

    const handleToggle = (key: 'care_reminder' | 'health_alert' | 'inventory_alert' | 'photo_alert') => {
        updatePreference(key, !preferences[key]);
    };

    const colors = {
        bg: 'bg-background',
        text: 'text-foreground',
        subText: 'text-muted-foreground',
        cardBg: 'bg-card',
        cardBorder: 'border-border',
        toggleOff: 'bg-slate-200 dark:bg-slate-700',
        peach: { bg: 'bg-brand-peach/10', text: 'text-brand-peach', highlight: 'bg-brand-peach' },
        slate: { bg: 'bg-slate-50', text: 'text-slate-500', highlight: 'bg-slate-600' },
    };

    const DiagnosticTools = () => (
        <div className="pt-4 border-t border-slate-100 space-y-3 mt-4">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">デバッグ診断ツール</h5>
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={async () => {
                        try {
                            const id = toast.loading('サーバーと通信中...');
                            const { createClient } = await import('@/lib/supabase');
                            const supabase = createClient();
                            const { data: { user } } = await supabase.auth.getUser();
                            const { data, error } = await supabase.functions.invoke('push-notification', {
                                body: { type: 'PING', record: { created_by: user?.id } }
                            });
                            toast.dismiss(id);
                            if (error) throw error;
                            const msg = `疎通成功: ${data?.status || 'OK'}`;
                            const detail = data?.active_tokens ? ` (有効トークン数: ${data.active_tokens})` : '';
                            toast.success(msg + detail, {
                                description: data?.note
                            });
                        } catch (e: any) {
                            toast.dismiss();
                            toast.error(`接続失敗: ${e.message || 'Unknown'}`);
                        }
                    }}
                    className={`py-2 px-3 ${colors.bg} ${colors.subText} rounded-xl text-[10px] font-bold border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2`}
                >
                    <span>サーバー疎通</span>
                </button>

                <button
                    onClick={async () => {
                        try {
                            const id = toast.loading('テスト通知を送信中...');
                            const { createClient } = await import('@/lib/supabase');
                            const supabase = createClient();
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('ユーザーが見つかりません');

                            const { error, data } = await supabase.functions.invoke('push-notification', {
                                body: { type: 'TEST', record: { created_by: user.id } }
                            });

                            if (error) {
                                let msg = error.message;
                                try {
                                    const response = (error as any).context;
                                    if (response && response.text) {
                                        const text = await response.text();
                                        const json = JSON.parse(text);
                                        msg = json.error || json.message || text;
                                    }
                                } catch (err) { }
                                throw new Error(msg);
                            }
                            if (data && data.success === false) throw new Error(data.message || '送信失敗');
                            toast.dismiss(id);
                            toast.success('送信成功！');
                        } catch (e: any) {
                            toast.dismiss();
                            toast.error(`エラー: ${e.message?.slice(0, 50)}`);
                        }
                    }}
                    className={`py-2 px-3 ${colors.peach.bg} ${colors.peach.text} rounded-xl text-[10px] font-bold border border-brand-peach/20 hover:bg-brand-peach/20 transition-colors flex items-center justify-center gap-2`}
                >
                    <Bell className="w-3 h-3" />
                    <span>通知テスト</span>
                </button>
            </div>
            <button
                onClick={() => setPermission('granted')}
                className="w-full py-1 text-[9px] text-slate-300 hover:text-slate-500 transition-colors"
            >
                [開発用] 強制的に設定画面へ進む
            </button>
        </div>
    );

    if (permission === 'granted') {
        return (
            <div className="space-y-4">
                <div className={`p-4 ${colors.peach.bg} rounded-2xl border border-brand-peach/10 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 bg-white rounded-full ${colors.peach.text} shadow-sm`}>
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className={`font-bold ${colors.text} text-sm`}>通知はオンです</h3>
                            <p className={`text-xs ${colors.subText}`}>最新の情報をお届けします</p>
                        </div>
                    </div>
                </div>

                {prefsLoading ? (
                    <div className={`p-12 text-center ${colors.subText}`}>
                        <Loader2 className="w-6 h-6 animate-spin mx-auto opacity-50" />
                    </div>
                ) : (
                    <div className={`p-5 ${colors.cardBg} backdrop-blur-md rounded-3xl border ${colors.cardBorder} shadow-sm space-y-6`}>
                        <h4 className={`text-xs font-bold ${colors.subText} uppercase tracking-wider ml-1`}>受け取る通知</h4>
                        <div className="space-y-5">
                            <div className="flex items-center justify-between group">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-0.5 p-2 ${colors.peach.bg} rounded-xl ${colors.peach.text}`}>
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className={`text-sm font-bold ${colors.text}`}>体調・気付き</span>
                                        <p className={`text-xs ${colors.subText}`}>嘔吐や食欲不振、気になる様子の記録</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('health_alert')}
                                    className={`w-12 h-7 rounded-full transition-all duration-300 relative ${preferences.health_alert ? colors.peach.highlight + ' shadow-md' : colors.toggleOff}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow-sm ${preferences.health_alert ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between group">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-0.5 p-2 ${colors.peach.bg} rounded-xl ${colors.peach.text}`}>
                                        <MessageCircle className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className={`text-sm font-bold ${colors.text}`}>とどける</span>
                                        <p className={`text-xs ${colors.subText}`}>家族が投稿した新しい写真や様子</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('photo_alert')}
                                    className={`w-12 h-7 rounded-full transition-all duration-300 relative ${preferences.photo_alert !== false ? colors.peach.highlight + ' shadow-md' : colors.toggleOff}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow-sm ${preferences.photo_alert !== false ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between group">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-0.5 p-2 ${colors.peach.bg} rounded-xl ${colors.peach.text}`}>
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className={`text-sm font-bold ${colors.text}`}>在庫アラート</span>
                                        <p className={`text-xs ${colors.subText}`}>フードや猫砂の補充タイミング</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('inventory_alert')}
                                    className={`w-12 h-7 rounded-full transition-all duration-300 relative ${preferences.inventory_alert !== false ? colors.peach.highlight + ' shadow-md' : colors.toggleOff}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow-sm ${preferences.inventory_alert !== false ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between group">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-0.5 p-2 ${colors.peach.bg} rounded-xl ${colors.peach.text}`}>
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className={`text-sm font-bold ${colors.text}`}>お世話リマインダー</span>
                                        <p className={`text-xs ${colors.subText}`}>ごはんやトイレ掃除の忘れ防止</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('care_reminder')}
                                    className={`w-12 h-7 rounded-full transition-all duration-300 relative ${preferences.care_reminder ? colors.peach.highlight + ' shadow-md' : colors.toggleOff}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow-sm ${preferences.care_reminder ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className={`pt-4 border-t ${colors.cardBorder}`}>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className={`text-sm font-bold ${colors.text}`}>通知時間</span>
                                    <p className={`text-xs ${colors.subText}`}>毎日この時間にお知らせ</p>
                                </div>
                                <select
                                    value={preferences.notification_hour ?? 20}
                                    onChange={(e) => updatePreference('notification_hour', parseInt(e.target.value))}
                                    className={`px-4 py-2 text-sm ${colors.bg} rounded-xl border-none focus:ring-2 focus:ring-brand-peach ${colors.text} cursor-pointer`}
                                >
                                    <option value={-1}>指定なし</option>
                                    <option value={8}>朝 8:00</option>
                                    <option value={20}>夜 20:00</option>
                                </select>
                            </div>
                            <DiagnosticTools />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (permission === 'denied') {
        return (
            <div className="space-y-4 text-center">
                <div className={`p-6 ${colors.cardBg} rounded-3xl border ${colors.cardBorder} space-y-4`}>
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-red-50 rounded-full text-red-500">
                            <BellOff className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-900 text-sm">通知が許可されていません</h3>
                            <p className="text-xs text-red-700 mt-1 leading-relaxed">
                                ブラウザの設定で通知がブロックされています。
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className={`w-full py-3 ${colors.cardBg} ${colors.text} rounded-xl text-sm font-bold border ${colors.cardBorder} flex items-center justify-center gap-2`}
                    >
                        <Loader2 className="w-4 h-4" />
                        <span>再読み込み</span>
                    </button>
                    <DiagnosticTools />
                </div>
            </div>
        );
    }

    return (
        <div className={`p-6 ${colors.cardBg} backdrop-blur-md rounded-3xl border ${colors.cardBorder} shadow-sm space-y-4 text-center`}>
            <div className="flex flex-col items-center gap-3 mb-2">
                <div className={`p-4 ${colors.peach.bg} rounded-full ${colors.peach.text}`}>
                    <Bell className="w-8 h-8" />
                </div>
                <div>
                    <h3 className={`font-bold ${colors.text} text-base`}>通知を受け取る</h3>
                    <p className={`text-xs ${colors.subText} mt-1`}>お世話の記録や家族からの写真を見逃しません</p>
                </div>
            </div>
            <button
                onClick={handleEnable}
                disabled={loading}
                className={`w-full py-3 ${colors.peach.highlight} text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-peach/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {!swReady && !loading ? '通知を準備中...' : (loading ? '処理中...' : '通知をオンにする')}
            </button>
            <DiagnosticTools />
        </div>
    );
}