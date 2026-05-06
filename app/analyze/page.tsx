'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { pinyin } from 'pinyin-pro'
import { getHskWord, type HskWord } from '../../lib/hsk'
import { colorPinyinLine, getToneColor } from '../../lib/toneColors'
import { recordTextView } from '../../lib/learnLog'
import DictionaryDrawer from '../components/DictionaryDrawer'
import ScrollUpButton from '../components/ScrollUpButton'

type CurrentText = {
  text: string
  source: string
  title: string
  link?: string
}

type ViewMode = 'hanzi' | 'pinyin' | 'english'

const LEVEL_BG: Record<number, string> = { 5: '#fff3e0', 6: '#fde8e8', 7: '#e3f2fd' }
const LEVEL_FG: Record<number, string> = { 5: '#e65100', 6: '#b71c1c', 7: '#0d47a1' }

function isHanzi(c: string): boolean { return /[一-鿿]/.test(c) }

export default function AnalyzePage() {
  const router = useRouter()
  const [data, setData] = useState<CurrentText | null>(null)
  const [view, setView] = useState<ViewMode>('hanzi')
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [translating, setTranslating] = useState(false)
  const [dictWord, setDictWord] = useState<string | null>(null)
  const [dictPinyin, setDictPinyin] = useState<string>('')

  useEffect(() => {
    const stored = localStorage.getItem('current_text')
    if (stored) try { setData(JSON.parse(stored)) } catch {}
  }, [])

  const paragraphs = useMemo(() => {
    if (!data) return []
    return data.text.split(/\n+/).map(p => p.trim()).filter(Boolean)
  }, [data])

  const charsByParagraph = useMemo(() => {
    return paragraphs.map(p => {
      const arr = p.split('')
      const py = pinyin(p, { type: 'array', toneType: 'symbol', nonZh: 'consecutive' }) as string[]
      return arr.map((ch, i) => ({ ch, py: isHanzi(ch) ? (py[i] || '') : '' }))
    })
  }, [paragraphs])

  const advancedWords = useMemo<HskWord[]>(() => {
    if (!data) return []
    const seen = new Set<string>()
    const out: HskWord[] = []
    const chars = data.text.split('').filter(isHanzi)
    for (let i = 0; i < chars.length - 1; i++) {
      const word = chars[i] + chars[i + 1]
      if (seen.has(word)) continue
      const hsk = getHskWord(word)
      if (hsk && hsk.level >= 5) {
        seen.add(word)
        out.push(hsk)
      }
    }
    return out.sort((a, b) => a.level - b.level)
  }, [data])

  useEffect(() => {
    if (!data) return
    recordTextView({ title: data.title, source: data.source }, advancedWords)
  }, [data, advancedWords])

  useEffect(() => {
    if (view !== 'english' || paragraphs.length === 0) return
    const missing = paragraphs.filter(p => !translations[p])
    if (missing.length === 0) return
    setTranslating(true)
    const controller = new AbortController()
    ;(async () => {
      const updates: Record<string, string> = {}
      for (const p of missing) {
        try {
          const r = await fetch('/api/translate?q=' + encodeURIComponent(p), { signal: controller.signal })
          const d = await r.json()
          updates[p] = d.translated || ''
        } catch { updates[p] = '' }
      }
      setTranslations(t => ({ ...t, ...updates }))
      setTranslating(false)
    })()
    return () => { controller.abort(); setTranslating(false) }
  }, [view, paragraphs, translations])

  if (!data) return (
    <main style={{paddingTop: '120px', textAlign: 'center', padding: '120px 24px 24px'}}>
      <p style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#4d4447'}}>还没选文章</p>
      <button onClick={() => router.push('/')} style={{marginTop: '16px', backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontFamily: 'Work Sans, sans-serif', cursor: 'pointer'}}>去阅读</button>
    </main>
  )

  const viewButtons: { mode: ViewMode; label: string }[] = [
    { mode: 'hanzi', label: '汉字' },
    { mode: 'pinyin', label: '拼音' },
    { mode: 'english', label: '英文' },
  ]

  return (
    <main style={{paddingBottom: '120px', maxWidth: '800px', margin: '0 auto'}}>
      <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#fff8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px'}}>
        <button onClick={() => router.push('/')} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
          <span className="material-symbols-outlined" style={{color: '#bc004b'}}>arrow_back</span>
        </button>
        <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#bc004b', margin: 0}}>词汇分析</h1>
        <button onClick={() => router.push('/dictate')} style={{
          backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '8px',
          padding: '8px 14px', cursor: 'pointer',
          fontFamily: 'Work Sans, sans-serif', fontSize: '12px', fontWeight: 600
        }}>听写 →</button>
      </header>

      <section style={{padding: '96px 24px 16px'}}>
        <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#b90c55', display: 'block', marginBottom: '8px'}}>{data.source}</span>
        <h2 style={{fontFamily: 'Newsreader, serif', fontSize: '22px', fontWeight: 700, lineHeight: 1.3, margin: '0 0 16px', overflowWrap: 'anywhere'}}>{data.title}</h2>
        <div style={{display: 'flex', gap: '6px', marginBottom: '20px'}}>
          {viewButtons.map(btn => (
            <button key={btn.mode} onClick={() => setView(btn.mode)} style={{
              padding: '6px 14px',
              backgroundColor: view === btn.mode ? '#bc004b' : '#fff0f4',
              color: view === btn.mode ? '#fff' : '#bc004b',
              border: 'none', borderRadius: '8px',
              fontFamily: 'Work Sans, sans-serif', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer'
            }}>{btn.label}</button>
          ))}
        </div>
      </section>

      <section style={{padding: '0 24px 32px'}}>
        {view === 'hanzi' && (
          <div style={{fontFamily: 'Newsreader, serif', fontSize: '17px', color: '#25181e', lineHeight: 1.8}}>
            {paragraphs.map((p, i) => (
              <p key={i} style={{margin: '0 0 16px', overflowWrap: 'anywhere'}}>{p}</p>
            ))}
          </div>
        )}

        {view === 'pinyin' && (
          <div>
            {charsByParagraph.map((chars, pi) => (
              <div key={pi} style={{display: 'flex', flexWrap: 'wrap', gap: '0 2px', marginBottom: '20px'}}>
                {chars.map((c, ci) => {
                  if (!c.py) {
                    return (
                      <span key={ci} style={{display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minHeight: '40px', fontFamily: 'Newsreader, serif', fontSize: 17, color: '#25181e', padding: '0 1px'}}>
                        <span style={{height: '14px'}}> </span>
                        <span>{c.ch}</span>
                      </span>
                    )
                  }
                  return (
                    <span key={ci} style={{display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: '0 2px', marginBottom: '4px'}}>
                      <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: 11, color: getToneColor(c.py), fontWeight: 600, lineHeight: 1, height: '13px'}}>{c.py}</span>
                      <span style={{fontFamily: 'Newsreader, serif', fontSize: 22, color: '#25181e', lineHeight: 1.3, marginTop: '2px'}}>{c.ch}</span>
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {view === 'english' && (
          <div>
            {paragraphs.map((p, i) => (
              <div key={i} style={{marginBottom: '20px'}}>
                <p style={{fontFamily: 'Newsreader, serif', fontSize: '17px', color: '#25181e', margin: '0 0 6px', lineHeight: 1.6, overflowWrap: 'anywhere'}}>{p}</p>
                <p style={{fontFamily: 'Newsreader, serif', fontSize: '14px', color: '#4d4447', fontStyle: 'italic', margin: 0, lineHeight: 1.5, overflowWrap: 'anywhere'}}>
                  {translations[p] || (translating ? '翻译中...' : '—')}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {advancedWords.length > 0 && (
        <section style={{padding: '0 24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px'}}>
            <h3 style={{fontFamily: 'Newsreader, serif', fontSize: '22px', color: '#bc004b', margin: 0}}>HSK 5+ 词汇</h3>
            <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7f7478'}}>{advancedWords.length} 个</span>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {advancedWords.map(w => (
              <button
                key={w.word}
                onClick={() => { setDictWord(w.word); setDictPinyin(w.pinyin) }}
                style={{textAlign: 'left', backgroundColor: '#fff', border: '1px solid #f0d8d8', borderRadius: '12px', padding: '12px 16px', cursor: 'pointer', display: 'block'}}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '4px'}}>
                  <div style={{flex: 1, minWidth: 0}}>
                    <p style={{fontFamily: 'Newsreader, serif', fontSize: '22px', fontWeight: 700, color: '#25181e', margin: '0 0 2px'}}>{w.word}</p>
                    <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '13px', margin: 0, fontWeight: 600}}>
                      {colorPinyinLine(w.pinyin).map((syl, i) => (
                        <span key={i} style={{color: syl.color, marginRight: 4}}>{syl.text}</span>
                      ))}
                    </p>
                  </div>
                  <span style={{flexShrink: 0, fontFamily: 'Work Sans, sans-serif', fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', backgroundColor: LEVEL_BG[w.level] || '#eee', color: LEVEL_FG[w.level] || '#444'}}>HSK {w.level === 7 ? '7-9' : w.level}</span>
                </div>
                <p style={{fontFamily: 'Newsreader, serif', fontSize: '13px', color: '#4d4447', margin: '4px 0 0', lineHeight: 1.5, overflowWrap: 'anywhere'}}>{w.meaning}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <DictionaryDrawer word={dictWord} pinyin={dictPinyin} onClose={() => setDictWord(null)} />
      <ScrollUpButton />
    </main>
  )
}
