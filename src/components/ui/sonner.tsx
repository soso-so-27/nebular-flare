"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      duration={2400}
      closeButton={false}
      icons={{
        success: null,
        info: null,
        warning: null,
        error: null,
        loading: <Loader2Icon className="size-4 animate-spin text-white/40" />,
      }}
      toastOptions={{
        className: "!rounded-[28px] !border-0 !shadow-[0_8px_32px_rgba(0,0,0,0.3)] !backdrop-blur-2xl",
        style: {
          background: "rgba(28, 28, 30, 0.92)",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "14px 24px",
          fontSize: "14px",
          fontWeight: "700",
          letterSpacing: "-0.01em",
        },
      }}
      style={
        {
          "--normal-bg": "rgba(28, 28, 30, 0.92)",
          "--normal-text": "#ffffff",
          "--normal-border": "rgba(255, 255, 255, 0.08)",
          "--border-radius": "28px",
          "--success-bg": "rgba(28, 28, 30, 0.95)",
          "--success-text": "#ffffff",
          "--error-bg": "rgba(28, 28, 30, 0.95)",
          "--error-text": "#ffffff",
          "--warning-bg": "rgba(28, 28, 30, 0.95)",
          "--warning-text": "#ffffff",
          "--info-bg": "rgba(28, 28, 30, 0.95)",
          "--info-text": "#ffffff",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
