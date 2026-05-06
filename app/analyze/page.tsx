'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getHskWord, type HskWord } from '../../lib/hsk'
import DictionaryDrawer from '../components/DictionaryDrawer'

type CurrentText = {
  text: string
  source: string
  title: string
  pickedAt: string
}

const LEVEL_BG: Record<number, string> = { 5: '#fff3e0', 6: '#fde8e8', 7: '#e3f2fd' }
const LEVEL_FG: Record<number, string> = { 5: '#e65100', 6: '#b71c1c', 7: '#0d47a1' }

export default function AnalyzePage() {
  const router = useRouter()
  const [data, setData] = useState<CurrentText | null>(null)
  const [dictWord, setDictWord] = useState<string | null>(null)
  const [dictPinyin, setDictPinyin] = useState<string>('')

  useEffect(() => {
    const stored = localStorage.getItem('current_text')
    if (stored) try { setData(JSON.parse(stored)) } catch {}
  }, [])

  const advancedWords = useMemo<HskWord[]>(() => {
    if (!data) return []
    const seen = new Set<string>()
    const out: HskWord[] = []
    const chars = data.text.split('').filter(c => /[一-鿿]/.test(c))
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

  if (!data) return (
    <main style={{paddingTop: '120px', textAlign: 'center', padding: '120px 24px 24px'}}>
      <p style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#4d4447'}}>还没选文章</p>
      <button onClick={() => router.push('/')} style={{marginTop: '16px', backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontFamily: 'Work Sans, sans-serif', cursor: 'pointer'}}>去阅读</button>
    </main>
  )

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
        <h2 style={{fontFamily: 'Newsreader, serif', fontSize: '24px', fontWeight: 700, lineHeight: 1.3, margin: '0 0 16px', overflowWrap: 'anywhere'}}>{data.title}</h2>
        <p style={{fontFamily: 'Newsreader, serif', fontSize: '15px', color: '#25181e', lineHeight: 1.7, marginBottom: '32px', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap'}}>{data.text}</p>
      </section>

      <section style={{padding: '0 24px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px'}}>
          <h3 style={{fontFamily: 'Newsreader, serif', fontSize: '24px', color: '#bc004b', margin: 0}}>HSK 5+ 词汇</h3>
          <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7f7478'}}>{advancedWords.length} 个</span>
        </div>
        {advancedWords.length === 0 ? (
          <p style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', color: '#7f7478', textAlign: 'center', padding: '20px 0'}}>这篇文章没有 HSK 5 以上的双字词</p>
        ) : (
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
                    <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '13px', color: '#bc004b', margin: 0}}>{w.pinyin}</p>
                  </div>
                  <span style={{flexShrink: 0, fontFamily: 'Work Sans, sans-serif', fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', backgroundColor: LEVEL_BG[w.level] || '#eee', color: LEVEL_FG[w.level] || '#444'}}>HSK {w.level === 7 ? '7-9' : w.level}</span>
                </div>
                <p style={{fontFamily: 'Newsreader, serif', fontSize: '13px', color: '#4d4447', margin: '4px 0 0', lineHeight: 1.5, overflowWrap: 'anywhere'}}>{w.meaning}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <DictionaryDrawer word={dictWord} pinyin={dictPinyin} onClose={() => setDictWord(null)} />
    </main>
  )
}
