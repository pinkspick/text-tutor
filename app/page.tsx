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

type Category = { key: string; label: string }

const DEFAULT_CATEGORIES: Category[] = [
  { key: 'current',  label: '时事' },
  { key: 'world',    label: '国际' },
  { key: 'tech',     label: '科技' },
  { key: 'culture',  label: '文化' },
  { key: 'history',  label: '历史' },
  { key: 'food',     label: '美食' },
  { key: 'feature',  label: '特写' },
]

const SOURCE_BG: Record<string, string> = {
  '联合早报': '#e3f2fd',
  '百度热搜': '#fff0f4',
  '百度电影': '#fff0f4',
  '百度电视剧': '#fff0f4',
  '百度小说': '#fff0f4',
  '36氪': '#fff3e0',
  '网易新闻': '#fde8e8',
  '网易': '#fde8e8',
  '知乎': '#e8f5e9',
}
const SOURCE_FG: Record<string, string> = {
  '联合早报': '#0d47a1',
  '百度热搜': '#bc004b',
  '百度电影': '#bc004b',
  '百度电视剧': '#bc004b',
  '百度小说': '#bc004b',
  '36氪': '#e65100',
  '网易新闻': '#b71c1c',
  '网易': '#b71c1c',
  '知乎': '#1b5e20',
}

export default function HomePage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [activeCat, setActiveCat] = useState<string>('current')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [picking, setPicking] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const [searchItems, setSearchItems] = useState<NewsItem[]>([])
  const [searching, setSearching] = useState(false)
  const router = useRouter()

  async function load(cat: string) {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/news?cat=' + cat + '&t=' + Date.now())
      const d = await r.json()
      setItems(Array.isArray(d.items) ? d.items : [])
      if (Array.isArray(d.categories) && d.categories.length) setCategories(d.categories)
      if (!Array.isArray(d.items) || d.items.length === 0) setError('暂无内容，请稍后再试或换一个分类')
    } catch {
      setError('加载失败，请检查网络')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (!searchActive) load(activeCat) }, [activeCat, searchActive])

  async function runSearch() {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearchActive(true)
    setError('')
    try {
      const r = await fetch('/api/search?q=' + encodeURIComponent(q))
      const d = await r.json()
      setSearchItems(Array.isArray(d.items) ? d.items : [])
      if (!Array.isArray(d.items) || d.items.length === 0) setError('找不到相关文章')
    } catch {
      setError('搜索失败')
      setSearchItems([])
    } finally {
      setSearching(false)
    }
  }

  function clearSearch() {
    setQuery('')
    setSearchActive(false)
    setSearchItems([])
    setError('')
  }

  async function pick(item: NewsItem) {
    setPicking(item.id)
    let text = item.title + '\n\n' + item.summary
    if (item.link) {
      try {
        const r = await fetch('/api/article?url=' + encodeURIComponent(item.link), { signal: AbortSignal.timeout(13000) })
        const d = await r.json()
        const summary = d.ogDescription && typeof d.ogDescription === 'string' ? d.ogDescription : item.summary
        if (d.text && typeof d.text === 'string' && d.text.length > 80) {
          text = item.title + '\n\n' + (summary && summary !== item.title ? summary + '\n\n' : '') + d.text
        } else if (summary && summary !== item.summary) {
          text = item.title + '\n\n' + summary
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
        <button onClick={() => load(activeCat)} disabled={loading} aria-label="刷新" style={{
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

      <section style={{padding: '96px 24px 8px'}}>
        <h2 style={{fontFamily: 'Newsreader, serif', fontSize: '30px', fontWeight: 700, lineHeight: 1.1, marginBottom: '4px'}}>选篇文章</h2>
        <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#7f7478', margin: 0}}>联合早报 · 百度 · 36氪 · 网易 · 搜索</p>
      </section>

      <section style={{padding: '12px 16px 4px'}}>
        <div style={{position: 'relative'}}>
          <span className="material-symbols-outlined" style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
            color: '#bc004b', fontSize: 22
          }}>search</span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
            placeholder="搜索关键词..."
            style={{
              width: '100%', backgroundColor: '#fff0f4', border: 'none',
              borderRadius: '12px', padding: '12px 56px 12px 44px',
              fontSize: '16px', fontFamily: 'Newsreader, serif',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
          {searchActive && (
            <button onClick={clearSearch} aria-label="清除搜索" style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span className="material-symbols-outlined" style={{color: '#7f7478', fontSize: 22}}>close</span>
            </button>
          )}
        </div>
      </section>

      {!searchActive && (
        <nav style={{
          position: 'sticky', top: '72px', zIndex: 40,
          padding: '8px 0',
          backgroundColor: '#fff8f8',
        }}>
          <div style={{
            display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 16px',
            scrollbarWidth: 'none' as const,
          }}>
            {categories.map(cat => {
              const active = cat.key === activeCat
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCat(cat.key)}
                  style={{
                    flexShrink: 0,
                    padding: '8px 16px', borderRadius: '999px',
                    backgroundColor: active ? '#bc004b' : '#fff0f4',
                    color: active ? '#fff' : '#bc004b',
                    border: 'none', cursor: 'pointer',
                    fontFamily: 'Newsreader, serif', fontSize: '15px', fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>{cat.label}</button>
                )
            })}
          </div>
        </nav>
      )}

      {searchActive && (
        <section style={{padding: '8px 24px 0'}}>
          <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#7f7478', margin: 0}}>
            搜索 “{query}” {searching ? '· 中...' : `· ${searchItems.length} 条结果`}
          </p>
        </section>
      )}

      <section style={{padding: '8px 16px 0'}}>
        {error && <p style={{padding: '20px', textAlign: 'center', fontFamily: 'Newsreader, serif', fontStyle: 'italic', color: '#7f7478'}}>{error}</p>}
        {((searchActive ? searching : loading) && (searchActive ? searchItems : items).length === 0) && (
          <p style={{padding: '40px 20px', textAlign: 'center', fontFamily: 'Newsreader, serif', fontStyle: 'italic', color: '#7f7478'}}>{searchActive ? '搜索中...' : '加载中...'}</p>
        )}
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {(searchActive ? searchItems : items).map(it => (
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
                <p style={{fontFamily: 'Newsreader, serif', fontSize: '18px', fontWeight: 700, color: '#25181e', margin: '0 0 4px', lineHeight: 1.3, overflowWrap: 'anywhere'}}>{it.title}</p>
                {it.summary && it.summary !== it.title && (
                  <p style={{fontFamily: 'Newsreader, serif', fontSize: '14px', color: '#4d4447', margin: 0, lineHeight: 1.4, overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{it.summary}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <ScrollUpButton />
    </main>
  )
}
