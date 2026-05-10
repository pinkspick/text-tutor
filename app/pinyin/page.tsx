'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { segment, OutputFormat } from 'pinyin-pro'
import { getToneColor } from '../../lib/toneColors'
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

export default function PinyinPage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [show, setShow] = useState(false)
  const [dictWord, setDictWord] = useState<string | null>(null)
  const [dictPinyin, setDictPinyin] = useState('')

  const annotated = useMemo(() => show ? annotate(input) : [], [show, input])
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
          <h2 style={{fontFamily: 'Newsreader, serif', fontSize: '28px', fontWeight: 700, lineHeight: 1.2, marginBottom: '4px'}}>粘贴文字 · 标注拼音</h2>
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
        <section style={{padding: '96px 16px 24px'}}>
          {annotated.map((segs, pi) => (
            <div key={pi} style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '0 4px', marginBottom: '24px', padding: '0 8px'}}>
              {segs.map((seg, si) => {
                if (!isHanzi(seg.origin)) {
                  return (
                    <span key={si} style={{display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minHeight: '52px', padding: '0 1px'}}>
                      <span style={{height: '14px'}}> </span>
                      <span style={{fontFamily: 'Newsreader, serif', fontSize: 22, color: '#25181e', lineHeight: 1.3}}>{seg.origin}</span>
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
                      padding: '2px 4px 6px', margin: 0,
                      background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6
                    }}
                  >
                    <span style={{display: 'flex', gap: '2px', minHeight: 14, lineHeight: 1, marginBottom: 2}}>
                      {sylls.map((syl, j) => (
                        <span key={j} style={{fontFamily: 'Work Sans, sans-serif', fontSize: 12, color: getToneColor(syl), fontWeight: 600}}>{syl}</span>
                      ))}
                    </span>
                    <span style={{fontFamily: 'Newsreader, serif', fontSize: 26, color: '#25181e', lineHeight: 1.2, fontWeight: 500}}>{seg.origin}</span>
                  </button>
                )
              })}
            </div>
          ))}

          <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', color: '#7f7478', textAlign: 'center', marginTop: '32px', fontStyle: 'italic'}}>
            点任意词查字典 · 点 ✏️ 重写
          </p>
        </section>
      )}

      <DictionaryDrawer word={dictWord} pinyin={dictPinyin} onClose={() => setDictWord(null)} />
    </main>
  )
}
