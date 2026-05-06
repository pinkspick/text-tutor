'use client'
import { useEffect, useState } from 'react'

export default function ScrollUpButton() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 400) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!scrolled) return null
  return (
    <button
      onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
      aria-label="返回顶部"
      style={{
        position: 'fixed', right: '16px', bottom: '110px',
        width: '48px', height: '48px', borderRadius: '50%',
        backgroundColor: '#fff', color: '#bc004b',
        border: '1px solid #f4dce4', cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(188,0,75,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 40
      }}>
      <span className="material-symbols-outlined" style={{fontSize: '24px'}}>arrow_upward</span>
    </button>
  )
}
