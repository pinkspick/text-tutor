'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const path = usePathname()

  const tabs = [
    { href: '/', icon: 'newspaper', label: '阅读' },
    { href: '/analyze', icon: 'menu_book', label: '词汇' },
    { href: '/dictate', icon: 'edit_note', label: '听写' },
    { href: '/translate', icon: 'translate', label: '翻译' },
    { href: '/quiz', icon: 'quiz', label: '测验' },
    { href: '/review', icon: 'psychology', label: '复习' },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, width: '100%',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '10px 4px 20px',
      backgroundColor: 'rgba(255,248,248,0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: '2rem 2rem 0 0',
      boxShadow: '0px -12px 32px rgba(188,0,75,0.06)',
      zIndex: 50
    }}>
      {tabs.map(tab => {
        const active = path === tab.href
        return (
          <Link key={tab.href} href={tab.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '5px 8px', borderRadius: '9999px',
            backgroundColor: active ? '#f4dce4' : 'transparent',
            color: active ? '#bc004b' : '#4d4447',
            textDecoration: 'none', transition: 'all 0.2s'
          }}>
            <span className="material-symbols-outlined" style={{
              fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
              fontSize: '22px'
            }}>{tab.icon}</span>
            <span style={{
              fontFamily: 'Work Sans, sans-serif', fontSize: '9px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              marginTop: '3px', fontWeight: active ? 600 : 400
            }}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
