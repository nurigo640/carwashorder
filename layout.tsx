import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'АвтоМойка Про',
  description: 'Электронная очередь автомойки',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, padding: 0 }}>
        <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
