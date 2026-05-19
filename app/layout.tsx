import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'АвтоМойка Про — Электронная очередь',
  description: 'Система электронной очереди автомойки',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <div className="max-w-[390px] mx-auto min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
