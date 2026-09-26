import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import "./globals.css"

export const metadata: Metadata = {
  title: "AntojosGo - Descubre tu próxima comida favorita",
  description: "Aplicación de recomendaciones de comida basada en IA",
  generator: "v0.app",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#dc2626",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={GeistSans.variable}>
      <head>
        <style>{`
          html {
            font-family: ${GeistSans.style.fontFamily};
            --font-sans: ${GeistSans.style.fontFamily};
          }
        `}</style>
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
