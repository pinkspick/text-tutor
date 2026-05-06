'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type NewsItem = {
  id: string
  source: string
  title: string
  summary: string
  link?: string
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

  function pick(item: NewsItem) {
    const text = item.title + '\n\n' + item.summary
    localStorage.setItem('current_text', JSON.stringify({
      text,
      source: item.source,
      title: item.title,
      pickedAt: new Date().toISOString(),
    }))
    router.push('/analyze')
  }

  return (
    <main style={{paddingBottom: '120px', maxWidth: '800px', margin: '0 auto'}}>
      <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#fff8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px'}}>
        <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '24px', color: '#bc004b', margin: 0}}>文练</h1>
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
              style={{
                textAlign: 'left', backgroundColor: '#fff', border: '1px solid #f0d8d8',
                borderRadius: '14px', padding: '16px 18px', cursor: 'pointer', display: 'block'
              }}
            >
              <span style={{
                display: 'inline-block', fontFamily: 'Work Sans, sans-serif', fontSize: '10px', fontWeight: 600,
                padding: '3px 8px', borderRadius: '999px', marginBottom: '8px',
                backgroundColor: SOURCE_BG[it.source] || '#eee',
                color: SOURCE_FG[it.source] || '#444',
              }}>{it.source}</span>
              <p style={{fontFamily: 'Newsreader, serif', fontSize: '18px', fontWeight: 700, color: '#25181e', margin: '0 0 6px', lineHeight: 1.3, overflowWrap: 'anywhere'}}>{it.title}</p>
              <p style={{fontFamily: 'Newsreader, serif', fontSize: '13px', color: '#4d4447', margin: 0, lineHeight: 1.5, overflowWrap: 'anywhere'}}>{it.summary}</p>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
