import React from "react";
import {
    Activity, AlertCircle, Award, Baby, Box, Brush, Cake, CalendarDays, Camera as CameraIcon2,
    Cat, Circle, Cloud, Droplets, Flame, Footprints, Frown, Gift, Heart, HeartPulse, Home,
    MapPin, Meh, Moon, Package, PawPrint, Scissors, Search, ShieldAlert, ShoppingBag,
    Smile, Sofa, Sparkles, Stethoscope, Sun, Target, TrendingUp, UserPlus, Utensils, Wind, Zap, Ghost
} from "lucide-react";

export interface ZukanItemDef {
    id: string;
    label: string;
    icon: React.ReactNode;
    isLegendary?: boolean;
}

export interface ZukanAxisDef {
    id: string;
    title: string;
    metaKey: string;
    items: ZukanItemDef[];
    color: string;
    fallbackIcon: React.ReactNode;
}

export const ZUKAN_AXES: ZukanAxisDef[] = [
    {
        id: 'pose', title: 'ポーズの記録', metaKey: 'pose', color: '#C8A97E', fallbackIcon: <PawPrint className="w-6 h-6" />,
        items: [
            // 王道・基本
            { id: 'pose_collapse', label: '脱力ポーズ', icon: <Ghost /> },
            { id: '香箱座り', label: '香箱座り', icon: <Package className="w-4 h-4" /> },
            { id: 'へそ天', label: 'へそ天', icon: <PawPrint className="w-4 h-4" /> },
            { id: '丸まり', label: '丸まり', icon: <Circle className="w-4 h-4" /> },
            { id: 'アンモニャイト', label: 'アンモニャイト', icon: <Circle className="w-4 h-4" /> },
            { id: 'のび', label: 'のび', icon: <Activity className="w-4 h-4" /> },
            { id: '座り', label: '座り', icon: <Cat className="w-4 h-4" /> },
            { id: '立ち', label: '立ち', icon: <TrendingUp className="w-4 h-4" /> },
            { id: '振り向き', label: '振り向き', icon: <CameraIcon2 className="w-4 h-4" /> },
            { id: 'あくび', label: 'あくび', icon: <Smile className="w-4 h-4" /> },
            { id: 'スフィンクス', label: 'スフィンクス', icon: <Cat className="w-4 h-4" /> },

            // ちょっと珍しい・かわいい
            { id: 'ちょこん座り', label: 'ちょこん座り', icon: <Cat className="w-4 h-4" /> },
            { id: 'ごめん寝', label: 'ごめん寝', icon: <Moon className="w-4 h-4" /> },
            { id: '箱イン', label: '箱イン', icon: <Box className="w-4 h-4" /> },
            { id: 'ふみふみ', label: 'ふみふみ', icon: <Sparkles className="w-4 h-4" /> },
            { id: '肉球チラ見せ', label: '肉球チラ見せ', icon: <PawPrint className="w-4 h-4" /> },
            { id: 'しっぽ巻き', label: 'しっぽ巻き', icon: <Activity className="w-4 h-4" /> },
            { id: 'ニャルモック', label: 'ニャルモック', icon: <Moon className="w-4 h-4" /> },
            { id: 'フレーメン', label: 'フレーメン', icon: <Smile className="w-4 h-4" /> },
            { id: 'バンザイ', label: 'バンザイ', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'クロス', label: '足クロス', icon: <Scissors className="w-4 h-4" /> },

            // さらに細かいポーズ
            { id: 'お腹見せ', label: 'お腹見せ', icon: <Heart className="w-4 h-4" /> },
            { id: 'ねじれ', label: 'ねじれ', icon: <Activity className="w-4 h-4" /> },
            { id: 'おしり向け', label: 'おしり向け', icon: <Footprints className="w-4 h-4" /> },
            { id: '横たわり', label: '横たわり', icon: <Moon className="w-4 h-4" /> },
            { id: '首かしげ', label: '首かしげ', icon: <Search className="w-4 h-4" /> },
            { id: 'ウィンク', label: 'ウィンク', icon: <Sparkles className="w-4 h-4" /> },
            { id: '舌出し', label: '舌出し', icon: <Smile className="w-4 h-4" /> },
            { id: '片手上げ', label: '片手上げ', icon: <Activity className="w-4 h-4" /> },
            { id: 'あごのせ', label: 'あごのせ', icon: <Moon className="w-4 h-4" /> },
            { id: '見下ろし', label: '見下ろし', icon: <CameraIcon2 className="w-4 h-4" /> },

            // 伝説のポーズ (Rare / Legendary)
            { id: '完全へそ天', label: '⭐️完全へそ天', icon: <Sparkles className="w-4 h-4 text-yellow-500" />, isLegendary: true },
            { id: '逆さ猫', label: '⭐️逆さ猫', icon: <Sparkles className="w-4 h-4 text-yellow-500" />, isLegendary: true },
            { id: '空中ジャンプ', label: '⭐️空中ジャンプ', icon: <Zap className="w-4 h-4 text-yellow-500" />, isLegendary: true },
            { id: '二足立ち', label: '⭐️二足立ち', icon: <TrendingUp className="w-4 h-4 text-yellow-500" />, isLegendary: true },
            { id: 'シンクロ', label: '⭐️シンクロ', icon: <UserPlus className="w-4 h-4 text-yellow-500" />, isLegendary: true },
            { id: '奇跡の瞬間', label: '⭐️奇跡の瞬間', icon: <CameraIcon2 className="w-4 h-4 text-yellow-500" />, isLegendary: true },
        ]
    },
    {
        id: 'action', title: '日常の行動', metaKey: 'action', color: '#A08D74', fallbackIcon: <Zap className="w-6 h-6" />,
        items: [
            // 日常
            { id: '寝る', label: '寝る', icon: <Moon className="w-4 h-4" /> },
            { id: '遊ぶ', label: '遊ぶ', icon: <Zap className="w-4 h-4" /> },
            { id: 'ジャンプ', label: 'ジャンプ', icon: <TrendingUp className="w-4 h-4" /> },
            { id: '毛づくろい', label: '毛づくろい', icon: <Heart className="w-4 h-4" /> },
            { id: '甘える', label: '甘える', icon: <HeartPulse className="w-4 h-4" /> },
            { id: '食べる', label: '食べる', icon: <Utensils className="w-4 h-4" /> },
            { id: '水を飲む', label: '水を飲む', icon: <Droplets className="w-4 h-4" /> },
            { id: '爪とぎする', label: '爪とぎする', icon: <Scissors className="w-4 h-4" /> },
            { id: '外を眺める', label: '外を眺める', icon: <Sun className="w-4 h-4" /> },
            { id: 'パトロール', label: 'パトロール', icon: <Search className="w-4 h-4" /> },

            // ハプニング
            { id: 'いたずら', label: 'いたずら', icon: <Flame className="w-4 h-4" /> },
            { id: 'かくれんぼ', label: 'かくれんぼ', icon: <Box className="w-4 h-4" /> },
            { id: '破壊', label: '破壊', icon: <Scissors className="w-4 h-4" /> },
            { id: '脱走未遂', label: '脱走未遂', icon: <AlertCircle className="w-4 h-4" /> },
            { id: '登りすぎ', label: '登りすぎ', icon: <TrendingUp className="w-4 h-4" /> },
            { id: '水こぼし', label: '水こぼし', icon: <Droplets className="w-4 h-4" /> },
            { id: '侵入禁止', label: '侵入禁止', icon: <ShieldAlert className="w-4 h-4" /> },

            // なかよし・他猫
            { id: '喧嘩', label: '喧嘩', icon: <Zap className="w-4 h-4" /> },
            { id: '追いかけっこ', label: '追いかけっこ', icon: <Activity className="w-4 h-4" /> },
            { id: 'すりすり', label: 'すりすり', icon: <Heart className="w-4 h-4" /> },
            { id: 'ぴったり', label: 'ぴったり', icon: <UserPlus className="w-4 h-4" /> },
            { id: '一緒に食事', label: '一緒に食事', icon: <Utensils className="w-4 h-4" /> },
            { id: '仲直り', label: '仲直り', icon: <Heart className="w-4 h-4" /> },
            { id: 'おもちゃ横取り', label: 'おもちゃ横取り', icon: <ShoppingBag className="w-4 h-4" /> },
            { id: '毛づくろい合い', label: '毛づくろい合い', icon: <HeartPulse className="w-4 h-4" /> }
        ]
    },
    {
        id: 'location', title: 'お気に入りの場所', metaKey: 'location', color: '#BFAE97', fallbackIcon: <Home className="w-6 h-6" />,
        items: [
            { id: 'ソファ', label: 'ソファ', icon: <Sofa className="w-4 h-4" /> },
            { id: 'ベッド', label: 'ベッド', icon: <Moon className="w-4 h-4" /> },
            { id: '窓辺', label: '窓辺', icon: <Sun className="w-4 h-4" /> },
            { id: '段ボール', label: '段ボール', icon: <Box className="w-4 h-4" /> },
            { id: 'キャットタワー', label: 'キャットタワー', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'キーボード', label: 'キーボード', icon: <Activity className="w-4 h-4" /> },
            { id: '膝の上', label: '膝の上', icon: <Heart className="w-4 h-4" /> },
            { id: 'こたつ', label: 'こたつ', icon: <Flame className="w-4 h-4" /> },
            { id: 'お風呂場', label: 'お風呂場', icon: <Droplets className="w-4 h-4" /> },
            { id: 'トイレ', label: 'トイレ', icon: <Wind className="w-4 h-4" /> },
            { id: 'キャリーの中', label: 'キャリーの中', icon: <ShoppingBag className="w-4 h-4" /> },
            { id: '高いところ', label: '高いところ', icon: <TrendingUp className="w-4 h-4" /> },
            { id: '狭いところ', label: '狭いところ', icon: <Box className="w-4 h-4" /> },
            { id: 'おもちゃ', label: 'おもちゃ', icon: <Zap className="w-4 h-4" /> },
            { id: '爪とぎ器', label: '爪とぎ器', icon: <Scissors className="w-4 h-4" /> },
            { id: 'カバンの中', label: 'カバンの中', icon: <ShoppingBag className="w-4 h-4" /> },
            { id: '冷蔵庫の上', label: '冷蔵庫の上', icon: <TrendingUp className="w-4 h-4" /> },
            { id: '玄関', label: '玄関', icon: <Home className="w-4 h-4" /> },
        ]
    },
    {
        id: 'emotion', title: 'きもちの動き', metaKey: 'emotion', color: '#D8C7B5', fallbackIcon: <Smile className="w-6 h-6" />,
        items: [
            { id: 'ごきげん', label: 'ごきげん', icon: <Sun className="w-4 h-4" /> },
            { id: 'ねむい', label: 'ねむい', icon: <Moon className="w-4 h-4" /> },
            { id: 'びっくり', label: 'びっくり', icon: <AlertCircle className="w-4 h-4" /> },
            { id: '集中', label: '集中', icon: <Target className="w-4 h-4" /> },
            { id: '甘えたい', label: '甘えたい', icon: <Heart className="w-4 h-4" /> },
            { id: '不満', label: '不満', icon: <Frown className="w-4 h-4" /> },
            { id: 'ドヤ顔', label: 'ドヤ顔', icon: <Award className="w-4 h-4" /> },
            { id: '真顔', label: '真顔', icon: <Meh className="w-4 h-4" /> },
            { id: '警戒', label: '警戒', icon: <ShieldAlert className="w-4 h-4" /> },
            { id: '退屈', label: '退屈', icon: <Cloud className="w-4 h-4" /> },
            { id: 'ワクワク', label: 'ワクワク', icon: <Sparkles className="w-4 h-4" /> },
            { id: 'リラックス', label: 'リラックス', icon: <Wind className="w-4 h-4" /> },
        ]
    },
    {
        id: 'event', title: '成長と思い出', metaKey: 'event', color: '#9B938B', fallbackIcon: <CalendarDays className="w-6 h-6" />,
        items: [
            { id: 'うちの子記念日', label: 'うちの子記念日', icon: <Heart className="w-4 h-4" /> },
            { id: '初めての冬', label: '初めての冬', icon: <Cloud className="w-4 h-4" /> },
            { id: '初めての夏', label: '初めての夏', icon: <Sun className="w-4 h-4" /> },
            { id: '初めての箱', label: '初めての箱', icon: <Box className="w-4 h-4" /> },
            { id: '病院がんばった', label: '病院がんばった', icon: <Stethoscope className="w-4 h-4" /> },
            { id: '誕生日', label: '誕生日', icon: <Cake className="w-4 h-4" /> },
            { id: '子猫時代', label: '子猫時代', icon: <Baby className="w-4 h-4" /> },
            { id: '大人の階段', label: '大人の階段', icon: <Cat className="w-4 h-4" /> },
            { id: '換毛期', label: '換毛期', icon: <Brush className="w-4 h-4" /> },
            { id: 'お正月', label: 'お正月', icon: <CalendarDays className="w-4 h-4" /> },
            { id: 'クリスマス', label: 'クリスマス', icon: <Gift className="w-4 h-4" /> },
            { id: 'ハロウィン', label: 'ハロウィン', icon: <Ghost className="w-4 h-4" /> },
        ]
    }
];

export const DAILY_MISSIONS = [
    { id: '香箱座り', label: '「香箱座り」を見つけよう！', desc: '前足を体の下に折りたたんで座る安心のポーズ。' },
    { id: 'へそ天', label: '「へそ天」を見つけよう！', desc: '仰向けでお腹を見せていたら信頼の証。' },
    { id: 'まんまる', label: '「まんまる」を見つけよう！', desc: '丸まって寝ていたらシャッターチャンス。' },
    { id: '箱イン', label: '「箱イン」を見つけよう！', desc: '段ボールや袋に入っていたらすかさずパシャリ！' },
    { id: 'あくび', label: '「あくび」の瞬間を見逃すな！', desc: 'ふわぁ〜っと大きな顔が撮れるかも。' },
    { id: 'ふみふみ', label: '「ふみふみ」を見つけよう！', desc: '甘えん坊モードの最高にかわいいしぐさ。' },
    { id: '完全へそ天', label: '【レア】「完全へそ天」に挑戦！', desc: '伝説のポーズ。完全にお腹を見せきった無防備な姿。' },
    { id: 'ごめん寝', label: '「ごめん寝」を見つけよう！', desc: '顔を床や腕に埋めて寝る、まぶしがりなポーズ。' },
];
