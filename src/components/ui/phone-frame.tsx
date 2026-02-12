import React from 'react';

interface PhoneFrameProps {
    children: React.ReactNode;
    className?: string;
    theme?: 'dark' | 'light';
    resolution?: 'standard' | 'high-res';
}

/**
 * A realistic "Home Card" style frame.
 * Removes the heavy bezel/titanium look in favor of the clean, minimal
 * aesthetic used in the app's Feed Cards, but scaled up for a full screen.
 */
export const PhoneFrame: React.FC<PhoneFrameProps> = ({
    children,
    className = '',
    theme = 'light',
    resolution = 'standard'
}) => {
    // 1080p vs Standard (Tailwind default rems)
    const isHighRes = resolution === 'high-res';
    const metrics = isHighRes ? {
        // High Res (1080p) - "Titanium" Style
        // Outer Frame (Titanium)
        outerRadius: 'rounded-[160px]',
        frameBorder: 'border-[8px] border-[#8a8a8a]/40', // Subtle outer edge definition

        // Inner Bezel (Black Glass)
        bezelInset: 'inset-[12px]', // Thickness of the Titanium frame
        bezelRadius: 'rounded-[148px]',
        bezelColor: 'bg-black',

        // Screen (Content)
        screenInset: 'inset-[32px]', // Thickness of the Black Bezel relative to Titanium
        screenRadius: 'rounded-[116px]',

        // Notch (Dynamic Island)
        notchWidth: 'w-[360px]',
        notchHeight: 'h-[108px]',
        notchRadius: 'rounded-[54px]',
        cameraSize: 'w-[24px] h-[24px]',
        notchTop: 'top-14', // Pushed down slightly for realism
    } : {
        // Standard (Card UI)
        outerRadius: 'rounded-[2.5rem]',
        frameBorder: 'border border-white/20',
        bezelInset: 'inset-0', // Combined
        bezelRadius: 'rounded-[2.5rem]',
        bezelColor: 'bg-transparent',
        screenInset: 'inset-[4px]',
        screenRadius: 'rounded-[2.2rem]',
        notchWidth: 'w-[90px]',
        notchHeight: 'h-6',
        notchRadius: 'rounded-b-2xl',
        cameraSize: 'w-1.5 h-1.5',
        notchTop: 'top-0',
    };

    return (
        <div className={`relative w-full h-full ${className} select-none`}>
            {/* 1. Titanium Frame (Outer Shell) */}
            <div className={`absolute inset-0 ${metrics.outerRadius} bg-gradient-to-br from-[#d4d4d4] via-[#737373] to-[#404040] shadow-2xl pointer-events-none z-10 box-border ${metrics.frameBorder}`}>
                {/* 1.5 Highlight Reflection (Titanium Sheen) */}
                <div className={`absolute inset-0 ${metrics.outerRadius} bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-50`}></div>
            </div>

            {/* 2. Black Bezel (Inner Frame) */}
            <div className={`absolute ${metrics.bezelInset} ${metrics.bezelRadius} ${metrics.bezelColor} pointer-events-none z-10 shadow-inner block`}></div>

            {/* 3. Screen Area (Clipping Container) */}
            <div className={`absolute ${metrics.screenInset} ${metrics.screenRadius} overflow-hidden bg-black z-20 isolate shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]`}>

                {/* Vol. 28: Notch removed as per user request */}
                {/* 
                <div className={`absolute ${metrics.notchTop} left-0 right-0 z-50 flex justify-center pointer-events-none`}>
                    <div className={`${metrics.notchHeight} ${metrics.notchWidth} bg-black ${metrics.notchRadius} mt-0 relative z-50 flex items-center justify-center shadow-lg`}>
                        <div className={`${metrics.cameraSize} rounded-full bg-[#1a1a1a] absolute right-8 opacity-60`}></div>
                        <div className={`${metrics.cameraSize} rounded-full bg-[#0f0f0f] absolute right-8 opacity-90 scale-50`}></div>
                    </div>
                </div>
                */}

                {/* Content Area */}
                <div className={`w-full h-full relative overflow-hidden ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
                    {children}
                </div>

                {/* 4. Screen Reflection Overlay (Subtle Glass Effect) */}
                <div className={`absolute inset-0 pointer-events-none z-40 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-30 ${metrics.screenRadius}`}></div>
                {/* Glossy Top Shine */}
                <div className={`absolute -top-[20%] -left-[20%] w-[140%] h-[50%] bg-gradient-to-b from-white/10 to-transparent rotate-12 pointer-events-none z-40 opacity-20 blur-3xl`}></div>
            </div>
        </div>
    );
};
