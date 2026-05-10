'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { segment, OutputFormat } from 'pinyin-pro'
import { getHskWord, type HskWord } from '../../lib/hsk'
import { colorPinyinLine, getToneColor } from '../../lib/toneColors'
import DictionaryDrawer from '../components/DictionaryDrawer'

type Seg = { origin: string; result: string }

function isHanzi(s: string): boolean {
  return /[一-鿿]/.test(s)
}

function annotate(text: string): Seg[][] {
  if (!text.trim()) return []
  const paragraphs = text.split(/\r?\n+/).filter(p => p.trim())
  return paragraphs.map(p =>
    segment(p, {
      format: OutputFormat.AllSegment,
      toneType: 'symbol',
    }) as Seg[]
  )
}

const LEVEL_BG: Record<number, string> = { 5: '#fff3e0', 6: '#fde8e8', 7: '#e3f2fd' }
const LEVEL_FG: Record<number, string> = { 5: '#e65100', 6: '#b71c1c', 7: '#0d47a1' }

// Responsive font sizes — phones smaller, desktop full size.
const SZ_HANZI = 'clamp(18px, 5vw, 26px)'
const SZ_PINYIN = 'clamp(10px, 2.4vw, 12px)'
const SZ_PUNCT = 'clamp(16px, 4.5vw, 22px)'
const SZ_BASELINE_GAP = 'clamp(11px, 2.8vw, 14px)'
const SZ_NONZH_MIN = 'clamp(40px, 11vw, 52px)'
const SZ_HEADING = 'clamp(22px, 6.5vw, 28px)'
const SZ_VOCAB_HANZI = 'clamp(20px, 5.5vw, 26px)'

export default function PinyinPage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [show, setShow] = useState(false)
  const [dictWord, setDictWord] = useState<string | null>(null)
  const [dictPinyin, setDictPinyin] = useState('')

  const annotated = useMemo(() => show ? annotate(input) : [], [show, input])

  const advancedWords = useMemo<HskWord[]>(() => {
    if (!show || !input) return []
    const seen = new Set<string>()
    const out: HskWord[] = []
    const chars = input.split('').filter(isHanzi)
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
  }, [show, input])

  const charCount = (input.match(/[一-鿿]/g) || []).length
  const ready = charCount >= 1

  function reset() {
    setShow(false)
    setInput('')
  }

  return (
    <main style={{paddingBottom: '120px', maxWidth: '800px', margin: '0 auto'}}>
      <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#fff8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px'}}>
        <button onClick={() => router.push('/')} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
          <span className="material-symbols-outlined" style={{color: '#bc004b'}}>arrow_back</span>
        </button>
        <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#bc004b', margin: 0}}>注音</h1>
        {show ? (
          <button onClick={reset} aria-label="重写" style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex'}}>
            <span className="material-symbols-outlined" style={{color: '#bc004b'}}>edit</span>
          </button>
        ) : <span style={{width: 30}} />}
      </header>

      {!show ? (
        <section style={{padding: '96px 24px 24px'}}>
          <h2 style={{fontFamily: 'Newsreader, serif', fontSize: SZ_HEADING, fontWeight: 700, lineHeight: 1.2, marginBottom: '4px'}}>粘贴文字 · 标注拼音</h2>
          <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '12px', color: '#7f7478', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0, marginBottom: '20px'}}>按词分段 · 多音字按词义识别</p>

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="在这里粘贴中文..."
            autoFocus
            style={{
              width: '100%', minHeight: '220px', resize: 'vertical',
              padding: '14px', borderRadius: '12px',
              border: '2px solid #f0d8d8', backgroundColor: '#fff',
              fontFamily: 'Newsreader, serif', fontSize: '18px', lineHeight: 1.6,
              outline: 'none', boxSizing: 'border-box'
            }}
          />

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px'}}>
            <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', color: '#7f7478'}}>{charCount} 个汉字</span>
            <button
              onClick={() => setShow(true)}
              disabled={!ready}
              style={{
                backgroundColor: ready ? '#bc004b' : '#d0c3c7', color: '#fff',
                border: 'none', borderRadius: '10px', padding: '12px 24px',
                cursor: ready ? 'pointer' : 'default',
                fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600
              }}>标注 →</button>
          </div>
        </section>
      ) : (
        <>
          <section style={{padding: '96px 12px 16px'}}>
            {annotated.map((segs, pi) => (
              <div key={pi} style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '0 3px', marginBottom: '20px', padding: '0 4px'}}>
                {segs.map((seg, si) => {
                  if (!isHanzi(seg.origin)) {
                    return (
                      <span key={si} style={{display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minHeight: SZ_NONZH_MIN, padding: '0 1px'}}>
                        <span style={{height: SZ_BASELINE_GAP}}> </span>
                        <span style={{fontFamily: 'Newsreader, serif', fontSize: SZ_PUNCT, color: '#25181e', lineHeight: 1.3}}>{seg.origin}</span>
                      </span>
                    )
                  }
                  const sylls = seg.result.split(/\s+/).filter(Boolean)
                  return (
                    <button
                      key={si}
                      onClick={() => { setDictWord(seg.origin); setDictPinyin(seg.result) }}
                      style={{
                        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                        padding: '2px 3px 6px', margin: 0,
                        background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6
                      }}
                    >
                      <span style={{display: 'flex', gap: '2px', minHeight: SZ_BASELINE_GAP, lineHeight: 1, marginBottom: 2}}>
                        {sylls.map((syl, j) => (
                          <span key={j} style={{fontFamily: 'Work Sans, sans-serif', fontSize: SZ_PINYIN, color: getToneColor(syl), fontWeight: 600}}>{syl}</span>
                        ))}
                      </span>
                      <span style={{fontFamily: 'Newsreader, serif', fontSize: SZ_HANZI, color: '#25181e', lineHeight: 1.2, fontWeight: 500}}>{seg.origin}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </section>

          {advancedWords.length > 0 && (
            <section style={{padding: '8px 24px 0'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px', borderTop: '1px solid #f0d8d8', paddingTop: '20px'}}>
                <h3 style={{fontFamily: 'Newsreader, serif', fontSize: 'clamp(20px, 5vw, 24px)', color: '#bc004b', margin: 0}}>HSK 5+ 词汇</h3>
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
                        <p style={{fontFamily: 'Newsreader, serif', fontSize: SZ_VOCAB_HANZI, fontWeight: 700, color: '#25181e', margin: '0 0 2px'}}>{w.word}</p>
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

          <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', color: '#7f7478', textAlign: 'center', marginTop: '32px', fontStyle: 'italic'}}>
            点任意词查字典 · 点 ✏️ 重写
          </p>
        </>
      )}

      <DictionaryDrawer word={dictWord} pinyin={dictPinyin} onClose={() => setDictWord(null)} />
    </main>
  )
}
