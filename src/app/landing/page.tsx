"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    ArrowRight,
    CheckCircle2,
    Sparkles,
    ChevronDown,
    AlertCircle,
    Users,
    Heart,
    Cloud,
    ShieldCheck,
    Smartphone,
    Check,
    Info,
    Layers,
    Calendar,
    Zap,
    PlayCircle,
    Camera
} from "lucide-react";
import Link from "next/link";

// --- Sub-components ---

const Navbar = () => (
    <nav className="fixed top-0 inset-x-0 h-16 md:h-20 flex items-center justify-between px-6 md:px-12 z-50 bg-[#FAF8F5]/80 backdrop-blur-md border-b border-[#4E342E]/5">
        <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-[#E8B4A0] rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm">
                <CatIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold text-[#4E342E] tracking-tight font-serif">NyaruHD</span>
        </div>
        <div className="flex items-center gap-4">
            <Link href="/" className="px-5 py-2 bg-[#4E342E] text-white rounded-full text-xs md:text-sm font-bold shadow-lg shadow-black/5 hover:scale-105 transition-transform active:scale-95">
                アプリを開く
            </Link>
        </div>
    </nav>
);

const PhoneMockup = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`relative mx-auto w-full max-w-[280px] md:max-w-[320px] aspect-[9/18.5] bg-[#121214] rounded-[3rem] border-[8px] border-[#222] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] p-3 overflow-hidden ${className}`}>
        {/* Dynamic Island Area */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#222] rounded-b-2xl z-20 flex items-center justify-center">
            <div className="w-8 h-1 bg-white/10 rounded-full" />
        </div>
        <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-white">
            {children}
        </div>
    </div>
);

const ImageWithPlaceholder = ({ src, alt, icon: Icon = CatIcon }: { src: string, alt: string, icon?: any }) => {
    const [error, setError] = React.useState(false);

    return (
        <div className="w-full h-full bg-[#FAF8F5] flex items-center justify-center relative overflow-hidden">
            {!error ? (
                <img
                    src={src}
                    alt={alt}
                    onError={() => setError(true)}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="flex flex-col items-center gap-3 text-[#4E342E]/10 p-6 text-center">
                    <Icon className="w-16 h-16" />
                    <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">{alt}</p>
                </div>
            )}
        </div>
    );
};

// --- Sections ---

const Hero = () => (
    <section className="relative min-h-[90lvh] md:h-[100lvh] w-full flex items-center bg-[#FAF8F5] overflow-hidden pt-20 md:pt-0">
        <div className="absolute top-0 right-0 w-full md:w-[65%] h-full z-0 opacity-40 md:opacity-100">
            <ImageWithPlaceholder
                src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=2043"
                alt="愛猫との幸せな日常"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#FAF8F5] via-[#FAF8F5]/60 md:via-[#FAF8F5]/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5]/20 via-transparent to-[#FAF8F5]/90" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-start text-left">
            <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-2xl"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8B4A0]/10 text-[#E8B4A0] rounded-full text-[9px] md:text-[10px] font-black tracking-widest uppercase mb-6 md:mb-8 shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    猫専用ライフログ・モバイルアプリ
                </div>

                <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-bold text-[#4E342E] leading-[1.1] mb-6 md:mb-8 font-serif">
                    一日一枚の記録が、<br />
                    一生の宝物になる。
                </h1>

                <p className="text-lg md:text-2xl text-[#4E342E]/70 mb-10 md:mb-12 font-medium">
                    撮るだけでAIが自動整理。<br className="md:hidden" />
                    あなたは愛でるだけでいい。
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full sm:w-auto">
                    <Link href="/" className="w-full sm:w-auto px-10 py-4.5 md:px-12 md:py-5 bg-[#E8B4A0] text-white rounded-full text-lg md:text-xl font-bold shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3 active:scale-95">
                        無料ではじめる
                        <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                    </Link>

                    <div className="flex flex-wrap justify-center gap-4 text-[10px] md:text-xs text-[#4E342E]/40 font-bold">
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />1ヶ月無料</span>
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />App Store / Google Play</span>
                    </div>
                </div>
            </motion.div>
        </div>

        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 text-[#4E342E]/30 animate-bounce cursor-pointer flex flex-col items-center gap-2"
        >
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Scroll</span>
            <ChevronDown className="w-6 h-6 md:w-8 md:h-8" />
        </motion.div>
    </section>
);

const FeatureSection = ({
    title,
    desc,
    features,
    image,
    icon: Icon,
    reverse = false,
    tag
}: {
    title: string,
    desc: string,
    features: string[],
    image: string,
    icon: any,
    reverse?: boolean,
    tag?: string
}) => (
    <div className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12 md:gap-24`}>
        <div className="flex-1 space-y-6 md:space-y-8 text-center md:text-left">
            <div className={`w-12 h-12 bg-[#FAF8F5] rounded-xl flex items-center justify-center mx-auto md:mx-0 ${tag === 'Vet' ? 'text-rose-400' : tag === 'Atlas' ? 'text-[#E8B4A0]' : tag === 'Timeline' ? 'text-sky-400' : 'text-amber-400'}`}>
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-3xl md:text-5xl font-bold text-[#4E342E] font-serif leading-tight">
                {title}
            </h3>
            <p className="text-base md:text-lg text-[#4E342E]/60 leading-relaxed max-w-lg mx-auto md:mx-0">
                {desc}
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto md:mx-0">
                {features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[#4E342E]/70 font-medium font-serif justify-center md:justify-start">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> <span className="text-left">{f}</span>
                    </li>
                ))}
            </ul>
        </div>
        <div className="flex-1 w-full max-w-[280px] md:max-w-none">
            <PhoneMockup>
                <ImageWithPlaceholder src={image} alt={title} icon={Icon} />
            </PhoneMockup>
        </div>
    </div>
);

const FeaturesTour = () => (
    <section className="py-24 md:py-40 px-6 md:px-12 bg-white space-y-32 md:space-y-48">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20 md:mb-32 space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold text-[#4E342E] font-serif leading-tight">
                    手のひらに、<br className="md:hidden" />
                    愛猫との最高の居場所を。
                </h2>
                <p className="text-[#4E342E]/60 text-base md:text-lg max-w-2xl mx-auto">NyaruHDは、スマートフォンでの体験に特化した、猫と飼い主のための専用アプリです。</p>
            </div>

            <div className="space-y-32 md:space-y-48">
                <FeatureSection
                    tag="Atlas"
                    icon={Layers}
                    title="AI自動図鑑「Atlas」"
                    desc="アップロードした写真は、AIが猫の仕草や場所を自動解析。整理に時間をかけず、愛でる時間を増やしましょう。"
                    features={["AI自動タグ付け", "快適なアルバム検索", "一括整理機能"]}
                    image="https://images.unsplash.com/photo-1548247416-ec66f4900b2e?auto=format&fit=crop&q=80&w=1000"
                />
                <FeatureSection
                    tag="Timeline"
                    icon={Users}
                    reverse
                    title="家族専用「タイムライン」"
                    desc="LINEやSNSとは違う、猫だけの特別な場所。家族全員の「お世話」と「気づき」が、温かくリアルタイムに流れます。"
                    features={["お世話通知", "家族コメント", "愛猫専用アルバム"]}
                    image="https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?auto=format&fit=crop&q=80&w=1000"
                />
                <FeatureSection
                    tag="Rewind"
                    icon={Calendar}
                    title="思い出の再会「Rewind」"
                    desc="1年前の今日、あの子は何をしてた？ 過去の写真を「For You」としてお届け。懐かしい瞬間に毎日出会えます。"
                    features={["週刊思い出アルバム", "過去の今日表示", "通知で届く思い出"]}
                    image="https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?auto=format&fit=crop&q=80&w=1000"
                />
                <FeatureSection
                    tag="Vet"
                    icon={Heart}
                    reverse
                    title="確かな安心に「受診レポート」"
                    desc="診察室で「最近はどうですか？」と聞かれても安心。日々の健康記録を、獣医師へ伝えるための正確なレポートにまとめます。"
                    features={["受診用PDF出力", "体重トレンド確認", "1分で状況共有"]}
                    image="https://images.unsplash.com/photo-1599443015574-be5fe8a044b8?auto=format&fit=crop&q=80&w=1000"
                />
            </div>
        </div>
    </section>
);

const RoadmapSection = () => (
    <section className="py-24 px-6 md:px-12 bg-[#FAF8F5]">
        <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4E342E]/5 text-[#4E342E]/40 rounded-full text-[10px] font-black tracking-widest uppercase">
                    Application Roadmap
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-[#4E342E] font-serif">30日後に届く、新しい感動。</h2>
                <p className="text-[#4E342E]/60 text-base md:text-lg">開発中の機能も、トライアル期間中に続々と追加予定です。</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {[
                    {
                        icon: PlayCircle,
                        tag: "Premium",
                        title: "AIハイライト・ムービー",
                        desc: "1ヶ月の写真をAIが自動で感動的な1分のショートムービーに。音楽と共に、成長の記録が鮮やかに蘇ります。"
                    },
                    {
                        icon: Zap,
                        tag: "Premium",
                        title: "ヘルス・インサイト分析",
                        desc: "蓄積されたデータから、食欲や活動の「予兆」をAIが検知。一歩先の安心を飼い主さんに届けます。"
                    }
                ].map((item, i) => (
                    <div key={i} className="p-8 md:p-10 bg-white rounded-[2.5rem] md:rounded-[40px] shadow-sm border border-[#4E342E]/5 hover:shadow-xl transition-all duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#E8B4A0]/10 rounded-2xl flex items-center justify-center text-[#E8B4A0]">
                                <item.icon className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <span className="text-[9px] font-black text-[#E8B4A0] border border-[#E8B4A0]/20 px-2 py-0.5 rounded-full uppercase tracking-widest">{item.tag}</span>
                        </div>
                        <h4 className="text-xl md:text-2xl font-bold text-[#4E342E] mb-3 md:mb-4 font-serif">{item.title}</h4>
                        <p className="text-xs md:text-sm text-[#4E342E]/60 leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const PricingSection = () => (
    <section id="pricing" className="py-24 md:py-32 px-6 md:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 md:mb-20 space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold text-[#4E342E] font-serif">ずっと続く、安心のプラン</h2>
                <p className="text-[#4E342E]/60 text-base md:text-lg">まずは1ヶ月、無料ですべての機能をお試しください。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 max-w-4xl mx-auto">
                {/* Standard Plan */}
                <div className="relative p-8 md:p-10 bg-[#FAF8F5] rounded-[2.5rem] md:rounded-[48px] border border-[#4E342E]/5 flex flex-col">
                    <div className="mb-6 md:mb-8">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#4E342E]/5 rounded-full text-[10px] font-bold text-[#4E342E]/40 mb-4 uppercase">
                            <Camera className="w-3 h-3" /> 画像メイン
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-[#4E342E] font-serif mb-2">スタンダード</h3>
                        <p className="text-[#4E342E]/50 text-xs md:text-sm italic">静止画で残す、愛おしい日常</p>
                    </div>
                    <div className="mb-8 md:mb-10 flex items-baseline gap-1">
                        <span className="text-3xl md:text-4xl font-black text-[#4E342E]">¥980</span>
                        <span className="text-[#4E342E]/40 text-xs md:text-sm font-bold">/月 (税込)</span>
                    </div>
                    <ul className="space-y-4 mb-10 flex-grow">
                        {[
                            "1ヶ月無料トライアル",
                            "高画質写真の無制限保存",
                            "AI自動図鑑 Atlas",
                            "家族共有（最大2人）",
                            "受診レポート作成"
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-xs md:text-sm font-medium text-[#4E342E]/70 font-serif">
                                <Check className="w-4 h-4 text-[#E8B4A0]" />
                                {item}
                            </li>
                        ))}
                        <li className="flex items-center gap-3 text-xs md:text-sm font-medium text-[#4E342E]/20 font-serif line-through">
                            動画の保存・再生
                        </li>
                    </ul>
                    <Link href="/" className="w-full py-4 md:py-5 bg-white text-[#4E342E] border border-[#4E342E]/10 rounded-2xl font-bold text-center hover:bg-[#4E342E] hover:text-white transition-all shadow-sm">
                        スタンダードで体験
                    </Link>
                </div>

                {/* Premium Plan */}
                <div className="relative p-8 md:p-10 bg-[#4E342E] text-white rounded-[2.5rem] md:rounded-[48px] shadow-3xl flex flex-col md:scale-105 z-10 overflow-hidden">
                    <div className="absolute top-0 right-0 px-6 py-2 bg-[#E8B4A0] text-white text-[9px] font-black uppercase tracking-widest rounded-bl-2xl">
                        Popular
                    </div>
                    <div className="mb-6 md:mb-8">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-[#E8B4A0] mb-4 uppercase">
                            <PlayCircle className="w-3 h-3" /> 動画・フル機能
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold font-serif mb-2">プレミアム</h3>
                        <p className="text-white/40 text-xs md:text-sm italic">動画とAIで、もっと鮮明な絆に</p>
                    </div>
                    <div className="mb-8 md:mb-10 flex items-baseline gap-1">
                        <span className="text-3xl md:text-4xl font-black">¥1,480</span>
                        <span className="text-white/40 text-xs md:text-sm font-bold">/月 (税込)</span>
                    </div>
                    <ul className="space-y-4 mb-10 flex-grow">
                        {[
                            "1ヶ月無料トライアル",
                            "動画・写真の無制限保存",
                            "家族共有（無制限）",
                            "受診レポート詳細分析",
                            "AIハイライトムービー作成 (Soon)",
                            "優先サポート"
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-xs md:text-sm font-medium text-white/80 font-serif">
                                <Check className="w-4 h-4 text-[#E8B4A0]" />
                                {item}
                            </li>
                        ))}
                    </ul>
                    <Link href="/" className="w-full py-4 md:py-5 bg-[#E8B4A0] text-white rounded-2xl font-bold text-center hover:bg-[#E8A58D] transition-all shadow-xl shadow-[#E8B4A0]/20">
                        プレミアムで体験
                    </Link>
                </div>
            </div>

            <p className="text-center mt-12 text-[#4E342E]/30 text-[10px] md:text-xs font-serif flex items-center justify-center gap-2">
                <Info className="w-3 h-3" />
                トライアル期間終了まで料金は発生しません。解約はアプリ内からいつでも可能です。
            </p>
        </div>
    </section>
);

const FinalCTA = () => (
    <section className="py-24 md:py-32 px-6 text-center bg-[#FDF8F1]">
        <div className="max-w-4xl mx-auto space-y-10 md:space-y-12">
            <h2 className="text-3xl md:text-7xl font-bold font-serif leading-tight text-[#4E342E]">
                にゃるほど、<br />この子がいてよかった。
            </h2>
            <Link href="/" className="inline-flex items-center gap-3 px-12 py-5 md:px-16 md:py-6 bg-[#4E342E] text-white rounded-full text-lg md:text-2xl font-bold shadow-2xl hover:scale-105 transition-all w-full sm:w-auto overflow-hidden">
                無料でつくってみる
                <ArrowRight className="w-6 h-6" />
            </Link>
            <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-[10px] md:text-sm font-medium text-[#4E342E]/40 mt-8 font-serif">
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" />初回1ヶ月無料</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" />解約金なし</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" />今日からスタート</span>
            </div>
        </div>
    </section>
);

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#FAF8F5] selection:bg-[#E8B4A0]/30 selection:text-[#4E342E] text-[#4E342E]">
            <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Klee+One:wght@400;600&display=swap');
        .font-serif { font-family: 'Klee One', 'YuMincho', 'Yu Mincho', serif; }
        html { scroll-behavior: smooth; }
      `}</style>
            <Navbar />
            <main>
                <Hero />

                {/* Mobile Device Recognition Banner */}
                <section className="bg-[#4E342E] py-4 overflow-hidden">
                    <div className="flex flex-nowrap gap-8 animate-marquee whitespace-nowrap">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 text-white/40 text-[10px] font-black uppercase tracking-widest">
                                <Smartphone className="w-4 h-4" /> Available on App Store / Google Play
                            </div>
                        ))}
                    </div>
                </section>

                <section id="concept" className="py-20 md:py-24 px-6 md:px-12 text-center bg-white border-y border-[#4E342E]/5">
                    <div className="max-w-3xl mx-auto space-y-10 md:space-y-12">
                        <h2 className="text-[clamp(1.4rem,5vw,2.5rem)] text-[#4E342E] font-serif leading-relaxed italic">
                            「愛猫の写真はたくさんあるけれど、<br />
                            あの時の、あの瞬間の記憶はどこに行っただろう？」
                        </h2>
                        <p className="text-base md:text-lg text-[#4E342E]/50 font-medium leading-loose">
                            スマホに溢れる写真。忙しい日々に埋もれていく「可愛い」の瞬間。<br />
                            NyaruHDは、そのバラバラな日常を、一生モノの鮮明な物語に整えます。
                        </p>
                    </div>
                </section>

                <FeaturesTour />
                <RoadmapSection />
                <PricingSection />
                <FinalCTA />
            </main>

            <footer className="py-12 px-8 text-center bg-white border-t border-[#4E342E]/5">
                <p className="text-[10px] text-[#4E342E]/30 uppercase tracking-[0.2em] font-black">
                    © 2026 NyaruHD Team. Optimized for Mobile Devices.
                </p>
            </footer>

            <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
        </div>
    );
}

function CatIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="23" viewBox="0 0 24 23" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.45.65.18.8 1.1.35 1.47l-1.12.92C21.07 7.32 22 9.18 22 11c0 5.15-4.56 9-10 9s-10-3.85-10-9c0-1.82.93-3.68 2.35-5.8l-1.12-.92c-.45-.37-.3-1.29.35-1.47 1.39-.39 4.64.45 6.42 2.45.65-.17 1.33-.26 2-.26Z" />
            <path d="M9 10.5c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1Z" /><path d="M15 10.5c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1Z" /><path d="m8 15 2-1h4l2 1" />
        </svg>
    );
}
