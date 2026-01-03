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
      duration={2000}
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        className: "!rounded-2xl !border-0 !shadow-lg !backdrop-blur-md",
        style: {
          background: "rgba(0, 0, 0, 0.8)",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: "500",
        },
      }}
      style={
        {
          "--normal-bg": "rgba(0, 0, 0, 0.8)",
          "--normal-text": "#ffffff",
          "--normal-border": "rgba(255, 255, 255, 0.1)",
          "--border-radius": "16px",
          "--success-bg": "rgba(16, 185, 129, 0.9)",
          "--success-text": "#ffffff",
          "--error-bg": "rgba(239, 68, 68, 0.9)",
          "--error-text": "#ffffff",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
