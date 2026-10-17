import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import "./globals.css"
import { TEXT_SIZES, TEXT_SIZE_KEY } from "@/shared/contracts/accessibility"

const TEXT_SIZE_SCRIPT = `try{var p=${JSON.stringify(Object.fromEntries(TEXT_SIZES.map(s => [s.id, s.percent])))}[localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)})];if(p&&p!==100)document.documentElement.style.fontSize=p+"%"}catch(e){}`

export const metadata: Metadata = {
  title: "AntojosGo - Descubre tu próxima comida favorita",
  description: "Encuentra restaurantes registrados cerca de ti y consulta su menú.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#173F35",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        {/* Text size chosen in «Mi cuenta», applied before paint so the page doesn't jump (components/text-size-control.tsx). */}
        <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_SCRIPT }} />
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
