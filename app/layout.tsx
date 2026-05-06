import type { Metadata } from 'next'
import './globals.css'
import BottomNav from './components/BottomNav'

export const metadata: Metadata = {
  title: '文练 · Text Tutor',
  description: '汉字阅读练习 · HSK 5+ 词汇 · 听写测验',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  )
}
