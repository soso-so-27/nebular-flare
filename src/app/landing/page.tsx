"use client";

import React from "react";
import {
    ArrowRight,
    Bell,
    Camera,
    Check,
    HeartHandshake,
    PawPrint,
    Sparkles,
    Stars,
    Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const heroPoints = [
    "写真から始めやすい",
    "家族で見守りやすい",
    "あとから振り返りやすい",
];

const steps = [
    {
        id: "01",
        title: "撮る",
        body: "いつもの一枚を残す。",
        note: "まずは写真だけで大丈夫です。",
    },
    {
        id: "02",
        title: "たまる",
        body: "日々の記録として積み上がる。",
        note: "うちの子らしさが少しずつ見えてきます。",
    },
    {
        id: "03",
        title: "見返す",
        body: "家族で最近のようすを共有する。",
        note: "今週の変化も追いやすくなります。",
    },
];

const features = [
    {
        eyebrow: "Collection",
        title: "写真が、記録になる。",
        body: "アルバムで終わらず、その日の発見として残せます。",
        points: ["写真から始められる", "日々のようすがたまる"],
        image: "/demo-cat-1.png",
        tone: "light" as const,
        variant: "collection" as const,
    },
    {
        eyebrow: "Family Share",
        title: "家族で、同じ記録を見る。",
        body: "離れていても、最近のようすを同じ場所で追えます。",
        points: ["招待して共有できる", "見逃しを減らせる"],
        image: "/demo-cat-2.png",
        tone: "dark" as const,
        variant: "family" as const,
    },
    {
        eyebrow: "Weekly View",
        title: "1週間単位で、振り返れる。",
        body: "毎日の断片をまとめて見ると、変化が見えやすくなります。",
        points: ["週の流れを追いやすい", "思い出として残しやすい"],
        image: "/demo-cat-1.png",
        tone: "light" as const,
        variant: "weekly" as const,
    },
];

function CatIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="23"
            viewBox="0 0 24 23"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.45.65.18.8 1.1.35 1.47l-1.12.92C21.07 7.32 22 9.18 22 11c0 5.15-4.56 9-10 9s-10-3.85-10-9c0-1.82.93-3.68 2.35-5.8l-1.12-.92c-.45-.37-.3-1.29.35-1.47 1.39-.39 4.64.45 6.42 2.45.65-.17 1.33-.26 2-.26Z" />
            <path d="M9 10.5c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1Z" />
            <path d="M15 10.5c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1Z" />
            <path d="m8 15 2-1h4l2 1" />
        </svg>
    );
}

function SectionTag({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
    return (
        <p className={`text-[11px] font-black uppercase tracking-[0.28em] ${light ? "text-[#f0c793]" : "text-[#b56f3f]"}`}>
            {children}
        </p>
    );
}

function SectionHeading({
    title,
    body,
    light = false,
    align = "left",
}: {
    title: React.ReactNode;
    body?: React.ReactNode;
    light?: boolean;
    align?: "left" | "center";
}) {
    return (
        <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
            <h2
                className={`font-[var(--font-zen-maru)] text-4xl font-bold leading-[1.18] tracking-[-0.05em] md:text-5xl ${
                    light ? "text-white" : "text-[#3f2a22]"
                }`}
            >
                {title}
            </h2>
            {body ? (
                <p className={`mt-4 text-base leading-7 md:text-lg md:leading-8 ${light ? "text-white/72" : "text-[#5b4941]"}`}>
                    {body}
                </p>
            ) : null}
        </div>
    );
}

function Navbar() {
    return (
        <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#59392b]/10 bg-[#fcf5ea]/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[1.2rem] bg-[#d0884e] text-white shadow-[0_16px_36px_rgba(208,136,78,0.26)]">
                        <CatIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-[var(--font-zen-maru)] text-xl font-bold tracking-[-0.04em] text-[#3f2a22]">にゃるほど</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#aa734e]">Cat family journal</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/" className="hidden text-sm font-bold text-[#3f2a22]/60 transition-colors hover:text-[#3f2a22] md:inline-flex">
                        ログイン
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center rounded-full bg-[#3f2a22] px-5 py-2.5 text-sm font-black text-white transition-transform active:scale-95"
                    >
                        無料で使ってみる
                    </Link>
                </div>
            </div>
        </nav>
    );
}

function HeroVisual() {
    return (
        <div className="relative mx-auto w-full max-w-[420px]">
            <div className="absolute -left-8 top-16 hidden w-28 rounded-[1.6rem] border border-white/60 bg-white/80 p-2 shadow-[0_20px_40px_-28px_rgba(63,42,34,0.32)] backdrop-blur md:block">
                <div className="relative aspect-square overflow-hidden rounded-[1.1rem]">
                    <Image src="/demo-cat-2.png" alt="共有される写真" fill sizes="112px" className="object-cover" />
                </div>
                <p className="mt-2 text-center text-[11px] font-black tracking-[0.08em] text-[#6f584e]">share</p>
            </div>

            <div className="absolute -right-6 bottom-20 hidden w-24 rounded-[1.5rem] border border-[#ecdcc8] bg-[#fff7ec] p-2 shadow-[0_18px_36px_-26px_rgba(63,42,34,0.34)] md:block">
                <div className="relative aspect-square overflow-hidden rounded-[1rem]">
                    <Image src="/demo-cat-1.png" alt="週間サムネイル" fill sizes="96px" className="object-cover" />
                </div>
                <p className="mt-2 text-center text-[11px] font-black tracking-[0.08em] text-[#b56f3f]">week</p>
            </div>

            <div className="rounded-[2.8rem] border-[10px] border-[#1b1816] bg-[#1b1816] p-2 shadow-[0_50px_120px_-45px_rgba(24,16,12,0.72)]">
                <div className="overflow-hidden rounded-[2.2rem] bg-[#fff8f0]">
                    <div className="relative aspect-[10/18] bg-[linear-gradient(180deg,#fffaf4_0%,#f5eadf_100%)]">
                        <div className="absolute right-[-10%] top-[-8%] h-36 w-36 rounded-full bg-[#f2d3b1]/65 blur-3xl" />
                        <div className="absolute bottom-[16%] left-[-12%] h-32 w-32 rounded-full bg-[#dce7d5]/60 blur-3xl" />

                        <div className="absolute left-4 right-4 top-4 rounded-[1.4rem] border border-[#ecdcc8] bg-white/94 p-4 shadow-[0_20px_36px_-28px_rgba(63,42,34,0.36)]">
                            <div className="flex items-start gap-3">
                                <div className="relative h-14 w-14 overflow-hidden rounded-[1.1rem] ring-1 ring-[#ead8c4]">
                                    <Image src="/demo-cat-1.png" alt="今日の写真" fill sizes="56px" className="object-cover" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a86f46]">Daily highlight</p>
                                    <p className="mt-1 font-[var(--font-zen-maru)] text-lg font-bold text-[#3f2a22]">今日のハイライト</p>
                                    <p className="mt-2 text-sm leading-6 text-[#5c4c44]">写真から、その日の発見をひとつ残せます。</p>
                                </div>
                            </div>
                        </div>

                        <div className="absolute inset-x-4 top-[7.75rem] rounded-[1.4rem] border border-[#ecdcc8] bg-[#fff7ec]/95 p-4 shadow-[0_18px_36px_-28px_rgba(63,42,34,0.34)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a86f46]">Weekly album</p>
                                    <p className="mt-1 text-sm font-black text-[#3f2a22]">のんびり穏やかな1週間</p>
                                </div>
                                <Stars className="h-4 w-4 text-[#b56f3f]" />
                            </div>
                            <div className="mt-3 grid gap-2">
                                <div className="rounded-2xl bg-white px-3 py-2 text-sm font-bold text-[#4f4039]">日向ぼっこの写真が3枚</div>
                                <div className="rounded-2xl bg-white px-3 py-2 text-sm font-bold text-[#4f4039]">へそ天を1回発見</div>
                            </div>
                        </div>

                        <div className="absolute inset-x-4 bottom-4 rounded-[1.5rem] border border-white/12 bg-[#33231d]/82 p-4 text-white backdrop-blur-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#f0c793]/16 text-[#f0c793]">
                                        <HeartHandshake className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/48">Todokeru</p>
                                        <p className="text-sm font-black">家族からの更新</p>
                                    </div>
                                </div>
                                <Bell className="h-4 w-4 text-white/44" />
                            </div>
                            <p className="mt-3 text-sm leading-6 text-white/74">新しい写真や気づきを、離れていても同じ画面で見られます。</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Hero() {
    return (
        <section className="relative overflow-hidden px-6 pb-20 pt-28 md:px-12 md:pb-28 md:pt-36">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(240,199,147,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(208,136,78,0.12),_transparent_24%)]" />
            <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
                <div className="max-w-2xl">
                    <SectionTag>Cat family journal</SectionTag>
                    <h1 className="mt-5 font-[var(--font-zen-maru)] text-5xl font-bold leading-[1.06] tracking-[-0.06em] text-[#3f2a22] md:text-7xl">
                        猫との毎日を、
                        <br />
                        家族で残せる記録に。
                    </h1>
                    <div className="mt-6 max-w-xl space-y-3 text-base leading-7 text-[#5b4941] md:text-lg md:leading-8">
                        <p>にゃるほどは、写真から始められる猫の記録アプリです。</p>
                        <p>ためて、共有して、あとから振り返りやすく整えます。</p>
                    </div>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-3 rounded-full bg-[#d0884e] px-7 py-4 text-base font-black text-white shadow-[0_18px_40px_rgba(208,136,78,0.26)] transition-transform hover:scale-[1.02] active:scale-95"
                        >
                            無料で使ってみる
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                        <Link
                            href="#flow"
                            className="inline-flex items-center justify-center rounded-full border border-[#5a3e32]/12 bg-white/72 px-7 py-4 text-base font-bold text-[#3f2a22] transition-colors hover:bg-white"
                        >
                            記録の流れを見る
                        </Link>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        {heroPoints.map((point) => (
                            <div key={point} className="inline-flex items-center gap-2 rounded-full border border-[#5a3e32]/10 bg-white/76 px-4 py-2.5 text-sm font-bold text-[#4f4039]">
                                <Check className="h-4 w-4 text-[#b56f3f]" />
                                <span>{point}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <HeroVisual />
            </div>
        </section>
    );
}

function ValueStrip() {
    const items = [
        {
            icon: Camera,
            title: "写真から始める",
            body: "入力を増やしすぎない。",
        },
        {
            icon: Users,
            title: "家族で共有する",
            body: "最近のようすをまとめる。",
        },
        {
            icon: Sparkles,
            title: "あとから見返す",
            body: "変化や思い出を残しやすい。",
        },
    ];

    return (
        <section className="px-6 pb-10 md:px-12 md:pb-14">
            <div className="mx-auto grid max-w-6xl gap-3 rounded-[2rem] border border-[#5a3e32]/8 bg-white/76 p-3 shadow-[0_20px_44px_-36px_rgba(40,27,20,0.24)] md:grid-cols-3">
                {items.map(({ icon: Icon, title, body }) => (
                    <div key={title} className="rounded-[1.6rem] bg-[#fffaf3] p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4e0cb] text-[#b56f3f]">
                            <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-4 font-[var(--font-zen-maru)] text-2xl font-bold tracking-[-0.04em] text-[#3f2a22]">{title}</p>
                        <p className="mt-1.5 text-sm leading-6 text-[#5b4941]">{body}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function FlowSection() {
    return (
        <section id="flow" className="bg-white px-6 py-22 md:px-12 md:py-28">
            <div className="mx-auto max-w-6xl">
                <div className="max-w-2xl">
                    <SectionTag>Flow</SectionTag>
                    <SectionHeading
                        title="使い方は、3つだけ。"
                        body="読む量を増やさず、流れだけですぐ分かる構成にしています。"
                    />
                </div>

                <div className="mt-10 grid gap-4 lg:grid-cols-3">
                    {steps.map((step, index) => (
                        <div
                            key={step.id}
                            className={`rounded-[2rem] border p-7 ${
                                index === 1
                                    ? "border-[#3f2a22]/8 bg-[linear-gradient(180deg,#3b2720_0%,#2b1d18_100%)] text-white"
                                    : "border-[#5a3e32]/8 bg-[linear-gradient(180deg,#fffdfa_0%,#fdf3e7_100%)] text-[#3f2a22]"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`text-sm font-black tracking-[0.18em] ${index === 1 ? "text-[#f0c793]" : "text-[#b56f3f]"}`}>{step.id}</span>
                                <PawPrint className={`h-5 w-5 ${index === 1 ? "text-[#f0c793]" : "text-[#d0884e]"}`} />
                            </div>
                            <p className="mt-6 font-[var(--font-zen-maru)] text-3xl font-bold tracking-[-0.05em]">{step.title}</p>
                            <p className={`mt-3 text-lg leading-8 ${index === 1 ? "text-white/88" : "text-[#4f4039]"}`}>{step.body}</p>
                            <p className={`mt-6 text-sm leading-6 ${index === 1 ? "text-white/64" : "text-[#7a675f]"}`}>{step.note}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function FeatureMock({
    image,
    title,
    tone = "light",
    variant = "collection",
}: {
    image: string;
    title: string;
    tone?: "light" | "dark";
    variant?: "collection" | "family" | "weekly";
}) {
    const dark = tone === "dark";

    if (variant === "family") {
        return (
            <div className={`rounded-[2rem] border p-5 ${dark ? "border-white/10 bg-white/6" : "border-[#edd7c0] bg-[#fffaf3]"}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${dark ? "text-[#f0c793]" : "text-[#b56f3f]"}`}>Family chat</p>
                        <p className={`mt-1 font-[var(--font-zen-maru)] text-2xl font-bold ${dark ? "text-white" : "text-[#3f2a22]"}`}>{title}</p>
                    </div>
                    <Users className={`h-5 w-5 ${dark ? "text-[#f0c793]" : "text-[#b56f3f]"}`} />
                </div>

                <div className="mt-5 space-y-3">
                    <div className={`ml-auto max-w-[85%] rounded-[1.4rem] px-4 py-3 text-sm font-bold ${dark ? "bg-[#4a342c] text-white" : "bg-white text-[#4f4039]"}`}>
                        ごはん、いつも通り食べてるよ
                    </div>
                    <div className={`flex max-w-[92%] items-center gap-3 rounded-[1.4rem] px-3 py-3 ${dark ? "bg-white/8 text-white/86" : "bg-white text-[#4f4039]"}`}>
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                            <Image src={image} alt={title} fill sizes="48px" className="object-cover" />
                        </div>
                        <div className="text-sm font-bold leading-6">日向ぼっこしてた写真も追加しておいたよ</div>
                    </div>
                    <div className={`max-w-[80%] rounded-[1.4rem] px-4 py-3 text-sm font-bold ${dark ? "bg-white/8 text-white/86" : "bg-white text-[#4f4039]"}`}>
                        あとで一緒に見返そうね
                    </div>
                </div>
            </div>
        );
    }

    if (variant === "weekly") {
        return (
            <div className={`rounded-[2rem] border p-5 ${dark ? "border-white/10 bg-white/6" : "border-[#edd7c0] bg-[#fffaf3]"}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${dark ? "text-[#f0c793]" : "text-[#b56f3f]"}`}>Weekly board</p>
                        <p className={`mt-1 font-[var(--font-zen-maru)] text-2xl font-bold ${dark ? "text-white" : "text-[#3f2a22]"}`}>{title}</p>
                    </div>
                    <Stars className={`h-5 w-5 ${dark ? "text-[#f0c793]" : "text-[#b56f3f]"}`} />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((index) => (
                        <div key={index} className="space-y-2">
                            <div className="relative aspect-square overflow-hidden rounded-[1rem]">
                                <Image src={index === 1 ? "/demo-cat-2.png" : image} alt={title} fill sizes="96px" className="object-cover" />
                            </div>
                            <div className={`rounded-xl px-2 py-2 text-center text-[11px] font-black ${dark ? "bg-white/8 text-white/72" : "bg-white text-[#6f584e]"}`}>
                                {["朝の一枚", "日向ぼっこ", "寝顔"][index]}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-[2rem] border p-5 ${dark ? "border-white/10 bg-white/6" : "border-[#edd7c0] bg-[#fffaf3]"}`}>
            <div className="flex items-start gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1.1rem] ring-1 ring-black/5">
                    <Image src={image} alt={title} fill sizes="64px" className="object-cover" />
                </div>
                <div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${dark ? "text-[#f0c793]" : "text-[#b56f3f]"}`}>Preview</p>
                    <p className={`mt-1 font-[var(--font-zen-maru)] text-2xl font-bold leading-[1.2] ${dark ? "text-white" : "text-[#3f2a22]"}`}>{title}</p>
                </div>
            </div>

                <div className="mt-5 grid gap-2">
                <div className={`rounded-2xl px-3 py-3 text-sm font-bold ${dark ? "bg-white/8 text-white/86" : "bg-white text-[#4f4039]"}`}>今日のハイライト</div>
                <div className={`rounded-2xl px-3 py-3 text-sm font-bold ${dark ? "bg-white/8 text-white/86" : "bg-white text-[#4f4039]"}`}>最近の発見</div>
                <div className={`rounded-2xl px-3 py-3 text-sm font-bold ${dark ? "bg-white/8 text-white/86" : "bg-white text-[#4f4039]"}`}>週間アルバム</div>
            </div>
        </div>
    );
}

function FeatureSection({
    eyebrow,
    title,
    body,
    points,
    image,
    tone = "light",
    reverse = false,
    variant = "collection",
}: {
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
    image: string;
    tone?: "light" | "dark";
    reverse?: boolean;
    variant?: "collection" | "family" | "weekly";
}) {
    const dark = tone === "dark";

    return (
        <div
            className={`grid items-center gap-8 rounded-[2.4rem] border px-6 py-8 md:px-10 md:py-10 lg:grid-cols-[0.95fr_1.05fr] ${
                dark
                    ? "border-white/8 bg-[linear-gradient(180deg,#3b2720_0%,#2e1f1a_100%)]"
                    : "border-[#5a3e32]/8 bg-[linear-gradient(180deg,#fffdfa_0%,#fdf3e7_100%)]"
            } ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
        >
            <div className={dark ? "text-white" : "text-[#3f2a22]"}>
                <SectionTag light={dark}>{eyebrow}</SectionTag>
                <h3 className="mt-4 max-w-[10ch] font-[var(--font-zen-maru)] text-4xl font-bold leading-[1.14] tracking-[-0.05em] md:text-5xl">
                    {title}
                </h3>
                <p className={`mt-4 max-w-xl text-base leading-7 md:text-lg md:leading-8 ${dark ? "text-white/72" : "text-[#5b4941]"}`}>{body}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                    {points.map((point) => (
                        <div
                            key={point}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold ${
                                dark ? "bg-white/8 text-white/84" : "bg-white text-[#4f4039]"
                            }`}
                        >
                            <Check className={`h-4 w-4 ${dark ? "text-[#f0c793]" : "text-[#b56f3f]"}`} />
                            <span>{point}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className={`grid gap-4 ${reverse ? "sm:grid-cols-[1.1fr_0.9fr]" : "sm:grid-cols-[0.9fr_1.1fr]"}`}>
                <FeatureMock image={image} title={title} tone={tone} variant={variant} />
                <div className={`rounded-[2rem] border p-5 ${dark ? "border-white/10 bg-[#2a1b17]" : "border-[#edd7c0] bg-white"}`}>
                    <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${dark ? "text-[#f0c793]" : "text-[#b56f3f]"}`}>Why it works</p>
                    <p className={`mt-3 font-[var(--font-zen-maru)] text-2xl font-bold leading-[1.25] ${dark ? "text-white" : "text-[#3f2a22]"}`}>
                        文字を読む前に、
                        <br />
                        使い方が見えてくる。
                    </p>
                    <p className={`mt-4 text-sm leading-7 ${dark ? "text-white/68" : "text-[#5b4941]"}`}>
                        たくさん説明しなくても、何ができるかを画面の形で伝える構成にしています。
                    </p>
                </div>
            </div>
        </div>
    );
}

function Features() {
    return (
        <section className="px-6 py-24 md:px-12 md:py-32">
            <div className="mx-auto max-w-7xl space-y-8 md:space-y-10">
                <div className="mx-auto max-w-3xl text-center">
                    <SectionTag>Features</SectionTag>
                    <SectionHeading
                        title="必要な価値だけ、短く見せる。"
                        body="情報を足しすぎず、今のアプリで伝えられる強みだけに絞っています。"
                        align="center"
                    />
                </div>

                {features.map((feature, index) => (
                    <FeatureSection
                        key={feature.eyebrow}
                        eyebrow={feature.eyebrow}
                        title={feature.title}
                        body={feature.body}
                        points={feature.points}
                        image={feature.image}
                        tone={feature.tone}
                        reverse={index % 2 === 1}
                        variant={feature.variant}
                    />
                ))}
            </div>
        </section>
    );
}

function EasyStart() {
    return (
        <section className="bg-[linear-gradient(180deg,#f7efe4_0%,#f1e5d8_100%)] px-6 py-20 md:px-12 md:py-24">
            <div className="mx-auto grid max-w-6xl gap-8 rounded-[2.5rem] border border-[#5a3e32]/8 bg-white/78 p-8 shadow-[0_24px_56px_-40px_rgba(40,27,20,0.34)] md:p-12 lg:grid-cols-[0.95fr_1.05fr]">
                <div>
                    <SectionTag>Easy start</SectionTag>
                    <SectionHeading
                        title="がんばりすぎなくていい。"
                        body="最初から細かく記録しなくても、写真からゆるく始められます。"
                    />
                </div>

                <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
                    {[
                        "まずは写真だけでいい",
                        "家族だけで共有できる",
                        "あとから整理しやすい",
                    ].map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-[1.6rem] border border-[#edd7c0] bg-[#fffaf3] px-4 py-4 text-sm font-bold text-[#4f4039]">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4e0cb] text-[#b56f3f]">
                                <Check className="h-4 w-4" />
                            </div>
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function FinalCta() {
    return (
        <section className="relative overflow-hidden bg-[linear-gradient(180deg,#3b2720_0%,#241915_100%)] px-6 py-24 text-white md:px-12 md:py-32">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(240,199,147,0.18),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.08),_transparent_30%)]" />
            <div className="relative mx-auto max-w-4xl text-center">
                <SectionTag light>Start simple</SectionTag>
                <SectionHeading
                    title={
                        <>
                            今日の一枚から、
                            <br />
                            記録をはじめよう。
                        </>
                    }
                    body="写真が、そのまま思い出と記録になります。"
                    light
                    align="center"
                />

                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-3 rounded-full bg-[#d0884e] px-8 py-4 text-lg font-black text-white shadow-[0_18px_40px_rgba(208,136,78,0.28)] transition-transform hover:scale-[1.02] active:scale-95"
                    >
                        無料で使ってみる
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                    <Link
                        href="#flow"
                        className="inline-flex items-center justify-center rounded-full border border-white/14 px-8 py-4 text-lg font-bold text-white/78 transition-colors hover:bg-white/8"
                    >
                        使い方を見る
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#fcf5ea] text-[#3f2a22] selection:bg-[#efd8bd] selection:text-[#3f2a22]">
            <Navbar />
            <main>
                <Hero />
                <ValueStrip />
                <FlowSection />
                <Features />
                <EasyStart />
                <FinalCta />
            </main>

            <footer className="border-t border-[#5a3e32]/8 bg-white px-6 py-10 md:px-12">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4e0cb] text-[#b56f3f]">
                            <CatIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-[var(--font-zen-maru)] text-base font-bold tracking-[-0.04em] text-[#3f2a22]">にゃるほど</p>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#aa734e]">Cat family journal</p>
                        </div>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3f2a22]/36">2026 Nyaruhodo. Built for everyday life with cats.</p>
                </div>
            </footer>

            <style jsx global>{`
                html {
                    scroll-behavior: smooth;
                }
                body {
                    overflow-x: hidden;
                }
            `}</style>
        </div>
    );
}
