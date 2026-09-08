import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
})

export const metadata: Metadata = {
  title: "Project Finance — приложение для Bitrix24",
  description:
    "Локальное приложение Bitrix24 для ручного учёта доходов и расходов по проектам: прибыль, рентабельность, аналитика.",
  keywords: ["Bitrix24", "финансы проектов", "доходы", "расходы", "рентабельность"],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased bg-background text-foreground`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
