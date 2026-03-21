import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ねこコレクション - うちの子コレクション",
    description: "猫の写真をAIで自動分類。ポーズ・きもち・場所…11軸のコレクションを埋めよう。",
};

export default function CollectionLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
