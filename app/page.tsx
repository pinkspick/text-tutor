'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ScrollUpButton from './components/ScrollUpButton'

type NewsItem = {
  id: string
  source: string
  title: string
  summary: string
  link?: string
  image?: string
  publishedAt?: string
}

const SOURCE_BG: Record<string, string> = {
  'VOA 中文': '#fff3e0',
  '百度热搜': '#fff0f4',
}
const SOURCE_FG: Record<string, string> = {
  'VOA 中文': '#e65100',
  '百度热搜': '#bc004b',
}

export default function HomePage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function load() {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/news?t=' + Date.now())
      const d = await r.json()
      setItems(Array.isArray(d.items) ? d.items : [])
      if (!Array.isArray(d.items) || d.items.length === 0) setError('暂无新闻，请稍后再试')
    } catch {
      setError('加载失败，请检查网络')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const [picking, setPicking] = useState<string | null>(null)

  async function pick(item: NewsItem) {
    setPicking(item.id)
    let text = item.title + '\n\n' + item.summary
    if (item.link && item.source === 'VOA 中文') {
      try {
        const r = await fetch('/api/article?url=' + encodeURIComponent(item.link), { signal: AbortSignal.timeout(12000) })
        const d = await r.json()
        if (d.text && typeof d.text === 'string' && d.text.length > item.summary.length) {
          text = item.title + '\n\n' + d.text
        }
      } catch {}
    }
    localStorage.setItem('current_text', JSON.stringify({
      text,
      source: item.source,
      title: item.title,
      link: item.link,
      pickedAt: new Date().toISOString(),
    }))
    router.push('/analyze')
  }

  return (
    <main style={{paddingBottom: '120px', maxWidth: '800px', margin: '0 auto'}}>
      <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#fff8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <button onClick={() => router.push('/learn')} aria-label="学习记录" style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex'}}>
            <span className="material-symbols-outlined" style={{color: '#bc004b'}}>menu</span>
          </button>
          <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '24px', color: '#bc004b', margin: 0}}>文练</h1>
        </div>
        <button onClick={load} disabled={loading} aria-label="刷新" style={{
          background: '#fff0f4', border: 'none', borderRadius: '50%',
          width: 40, height: 40, cursor: loading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span className="material-symbols-outlined" style={{
            color: '#bc004b', fontSize: 22,
            animation: loading ? 'spin 1s linear infinite' : 'none'
          }}>refresh</span>
        </button>
      </header>

      <style>{`@keyframes spin { from {transform: rotate(0)} to {transform: rotate(360deg)} }`}</style>

      <section style={{padding: '96px 24px 16px'}}>
        <h2 style={{fontFamily: 'Newsreader, serif', fontSize: '32px', fontWeight: 700, lineHeight: 1.1, marginBottom: '4px'}}>选篇文章</h2>
        <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#7f7478', margin: 0}}>新闻 · 热搜 · 实时刷新</p>
      </section>

      <section style={{padding: '0 16px'}}>
        {error && <p style={{padding: '20px', textAlign: 'center', fontFamily: 'Newsreader, serif', fontStyle: 'italic', color: '#7f7478'}}>{error}</p>}
        {loading && items.length === 0 && (
          <p style={{padding: '40px 20px', textAlign: 'center', fontFamily: 'Newsreader, serif', fontStyle: 'italic', color: '#7f7478'}}>加载中...</p>
        )}
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {items.map(it => (
            <button
              key={it.id}
              onClick={() => pick(it)}
              disabled={picking !== null}
              style={{
                textAlign: 'left', backgroundColor: '#fff', border: '1px solid #f0d8d8',
                borderRadius: '14px', cursor: picking ? 'wait' : 'pointer', display: 'flex',
                gap: '12px', padding: '12px', width: '100%', alignItems: 'flex-start',
                opacity: picking && picking !== it.id ? 0.4 : 1
              }}
            >
              {it.image && (
                <div style={{flexShrink: 0, width: '72px', height: '72px', borderRadius: '8px', backgroundColor: '#fff0f4', overflow: 'hidden'}}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={it.image}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.currentTarget.parentElement as HTMLDivElement).style.display = 'none' }}
                    style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}}
                  />
                </div>
              )}
              <div style={{flex: 1, minWidth: 0}}>
                <span style={{
                  display: 'inline-block', fontFamily: 'Work Sans, sans-serif', fontSize: '9px', fontWeight: 600,
                  padding: '2px 7px', borderRadius: '999px', marginBottom: '6px',
                  backgroundColor: SOURCE_BG[it.source] || '#eee',
                  color: SOURCE_FG[it.source] || '#444',
                }}>{it.source}</span>
                <p style={{fontFamily: 'Newsreader, serif', fontSize: '17px', fontWeight: 700, color: '#25181e', margin: '0 0 4px', lineHeight: 1.3, overflowWrap: 'anywhere'}}>{it.title}</p>
                <p style={{fontFamily: 'Newsreader, serif', fontSize: '14px', color: '#4d4447', margin: 0, lineHeight: 1.4, overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{it.summary}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <ScrollUpButton />
    </main>
  )
}
