import React from 'react';

export const CatUpLogo = ({ className = "" }: { className?: string }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            className={className}
            aria-label="CatUp Logo"
        >
            <defs>
                <linearGradient id="sageGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-brand-sage)" stopOpacity="1" />
                    <stop offset="100%" stopColor="var(--color-brand-sage)" stopOpacity="1" />
                </linearGradient>
            </defs>

            {/* Cat outline - abstract, no face, soft lines */}
            <path
                d="M180 130 
                   Q150 120 140 80 
                   L155 180 
                   Q145 230 145 280 
                   Q140 340 160 390 
                   Q185 430 250 435 
                   Q320 440 340 410 
                   L355 450 
                   Q385 475 410 445 
                   L395 395 
                   Q430 365 430 300 
                   Q440 230 410 170 
                   L430 90 
                   Q400 115 375 135 
                   Q330 120 275 125 
                   Q220 120 180 130 Z"
                stroke="url(#sageGradient)"
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
};
