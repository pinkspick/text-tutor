'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { recordDictation } from '../../lib/learnLog'

type CurrentText = {
  text: string
  source: string
  title: string
}

function splitPhrases(text: string): string[] {
  const result: string[] = []
  let current = ''
  for (const ch of text) {
    current += ch
    if (/[。！？!?\n]/.test(ch)) {
      const t = current.trim()
      if (t) result.push(t)
      current = ''
    }
  }
  if (current.trim()) result.push(current.trim())
  const final: string[] = []
  for (const s of result) {
    const charCount = (s.match(/[一-鿿]/g) || []).length
    if (charCount <= 35) {
      if (charCount >= 4) final.push(s)
    } else {
      const subs = s.split(/[，；]/).map(x => x.trim()).filter(Boolean)
      for (const sub of subs) {
        const subChars = (sub.match(/[一-鿿]/g) || []).length
        if (subChars >= 4 && subChars <= 35) final.push(sub)
      }
    }
  }
  return final
}

function lcsMatched(expected: string, actual: string): boolean[] {
  const m = expected.length, n = actual.length
  const dp: number[][] = Array.from({length: m + 1}, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (expected[i - 1] === actual[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const matched = new Array<boolean>(m).fill(false)
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (expected[i - 1] === actual[j - 1]) { matched[i - 1] = true; i--; j-- }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--
    else j--
  }
  return matched
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    u.rate = 0.85
    window.speechSynthesis.speak(u)
  } catch {}
}

type CardState = {
  input: string
  submitted: boolean
  hidden: boolean
}

export default function DictatePage() {
  const router = useRouter()
  const [data, setData] = useState<CurrentText | null>(null)
  const [phrases, setPhrases] = useState<string[]>([])
  const [cards, setCards] = useState<CardState[]>([])
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('current_text')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CurrentText
        setData(parsed)
        const ps = splitPhrases(parsed.text)
        setPhrases(ps)
        setCards(ps.map(() => ({ input: '', submitted: false, hidden: false })))
      } catch {}
    }
  }, [])

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 400) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scores = useMemo(() => phrases.map((p, i) => {
    if (!cards[i]?.submitted) return null
    const matched = lcsMatched(p, cards[i].input)
    return p.length > 0 ? (matched.filter(Boolean).length / p.length) * 100 : 0
  }), [phrases, cards])

  const submittedScores = scores.filter((s): s is number => s !== null)
  const avgScore = submittedScores.length > 0 ? submittedScores.reduce((a, b) => a + b, 0) / submittedScores.length : null

  const loggedRef = useRef<{ count: number; total: number; avg: number } | null>(null)
  useEffect(() => {
    if (!data || phrases.length === 0) return
    const submittedCount = submittedScores.length
    if (submittedCount < phrases.length) return
    const avg = submittedScores.reduce((a, b) => a + b, 0) / submittedCount
    const sig = { count: submittedCount, total: phrases.length, avg }
    if (loggedRef.current && loggedRef.current.count === sig.count && loggedRef.current.total === sig.total && Math.abs(loggedRef.current.avg - sig.avg) < 0.01) return
    loggedRef.current = sig
    recordDictation({
      source: data.source,
      title: data.title,
      totalPhrases: phrases.length,
      submittedCount,
      avgScore: avg,
      perPhrase: phrases.map((p, i) => ({ expected: p, actual: cards[i]?.input || '', score: scores[i] ?? 0 })),
    })
  }, [data, phrases, cards, scores, submittedScores])

  function update(i: number, partial: Partial<CardState>) {
    setCards(c => c.map((card, idx) => idx === i ? { ...card, ...partial } : card))
  }

  if (!data) return (
    <main style={{padding: '120px 24px 24px', textAlign: 'center'}}>
      <p style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#4d4447'}}>还没选文章</p>
      <button onClick={() => router.push('/')} style={{marginTop: '16px', backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontFamily: 'Work Sans, sans-serif', cursor: 'pointer'}}>去阅读</button>
    </main>
  )

  if (phrases.length === 0) return (
    <main style={{padding: '120px 24px 24px', textAlign: 'center'}}>
      <p style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#4d4447'}}>这篇文章太短，无法听写</p>
      <button onClick={() => router.push('/')} style={{marginTop: '16px', backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontFamily: 'Work Sans, sans-serif', cursor: 'pointer'}}>换一篇</button>
    </main>
  )

  return (
    <main style={{paddingBottom: '140px', maxWidth: '700px', margin: '0 auto'}}>
      <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#fff8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px'}}>
        <button onClick={() => router.push('/analyze')} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
          <span className="material-symbols-outlined" style={{color: '#bc004b'}}>arrow_back</span>
        </button>
        <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '18px', color: '#bc004b', margin: 0}}>听写 · {phrases.length} 句</h1>
        <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '13px', color: '#bc004b', fontWeight: 600, minWidth: 60, textAlign: 'right'}}>
          {avgScore !== null ? avgScore.toFixed(1) : '—'}
          <span style={{color: '#7f7478', fontWeight: 400, fontSize: 11}}> /100</span>
        </span>
      </header>

      <section style={{padding: '96px 16px 16px'}}>
        <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7f7478', textAlign: 'center', marginBottom: '20px'}}>
          看着原句输入，或点 👁 隐藏来挑战记忆 · 点 🔊 听发音
        </p>

        <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
          {phrases.map((phrase, i) => {
            const card = cards[i] || { input: '', submitted: false, hidden: false }
            const matched = card.submitted ? lcsMatched(phrase, card.input) : null
            const score = scores[i]
            const scoreColor = score === null ? '#7f7478' : score >= 80 ? '#2e7d32' : score >= 50 ? '#fb8c00' : '#bc004b'
            return (
              <div key={i} style={{
                backgroundColor: '#fff', border: '1px solid #f0d8d8', borderRadius: '14px', padding: '14px 16px'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px'}}>
                  <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', color: '#7f7478', fontWeight: 600}}>第 {i + 1} 句</span>
                  <div style={{display: 'flex', gap: '6px'}}>
                    <button onClick={() => update(i, { hidden: !card.hidden })} aria-label={card.hidden ? '显示原句' : '隐藏原句'} style={{
                      background: card.hidden ? '#fff0f4' : 'transparent', border: 'none', borderRadius: '50%',
                      width: 30, height: 30, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <span className="material-symbols-outlined" style={{color: '#bc004b', fontSize: 18}}>{card.hidden ? 'visibility_off' : 'visibility'}</span>
                    </button>
                    <button onClick={() => speak(phrase)} aria-label="朗读" style={{
                      background: '#fff0f4', border: 'none', borderRadius: '50%',
                      width: 30, height: 30, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <span className="material-symbols-outlined" style={{color: '#bc004b', fontSize: 18}}>volume_up</span>
                    </button>
                  </div>
                </div>

                {card.hidden && !card.submitted ? (
                  <p style={{fontFamily: 'Newsreader, serif', fontSize: '18px', color: '#bdb1b5', fontStyle: 'italic', margin: '0 0 10px', minHeight: '32px'}}>（已隐藏，凭记忆输入）</p>
                ) : matched ? (
                  <p style={{fontFamily: 'Newsreader, serif', fontSize: '18px', lineHeight: 1.6, margin: '0 0 10px', overflowWrap: 'anywhere'}}>
                    {phrase.split('').map((ch, ci) => (
                      <span key={ci} style={{
                        color: matched[ci] ? '#2e7d32' : '#b71c1c',
                        backgroundColor: matched[ci] ? 'transparent' : '#fce8e8',
                        borderRadius: 3,
                        padding: matched[ci] ? 0 : '0 2px',
                      }}>{ch}</span>
                    ))}
                  </p>
                ) : (
                  <p style={{fontFamily: 'Newsreader, serif', fontSize: '18px', color: '#25181e', lineHeight: 1.6, margin: '0 0 10px', overflowWrap: 'anywhere'}}>{phrase}</p>
                )}

                <textarea
                  value={card.input}
                  onChange={e => update(i, { input: e.target.value })}
                  placeholder="在这里输入..."
                  rows={2}
                  style={{
                    width: '100%', resize: 'vertical', minHeight: '60px',
                    padding: '10px 12px', borderRadius: '10px',
                    border: '1.5px solid ' + (card.submitted ? '#f0d8d8' : '#f0d8d8'),
                    fontFamily: 'Newsreader, serif', fontSize: '17px', lineHeight: 1.5,
                    outline: 'none', backgroundColor: card.submitted ? '#fff8f0' : '#fff',
                  }}
                />

                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', gap: '8px'}}>
                  {card.submitted ? (
                    <>
                      <span style={{fontFamily: 'Newsreader, serif', fontSize: '20px', fontWeight: 700, color: scoreColor}}>
                        {score !== null ? score.toFixed(2) : '—'}
                        <span style={{fontSize: 12, color: '#7f7478', fontWeight: 400}}> / 100</span>
                      </span>
                      <button onClick={() => update(i, { submitted: false })} style={{
                        background: 'none', border: 'none', color: '#7f7478', cursor: 'pointer',
                        fontFamily: 'Work Sans, sans-serif', fontSize: '12px', textDecoration: 'underline'
                      }}>重做</button>
                    </>
                  ) : (
                    <>
                      <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', color: '#7f7478'}}>
                        {card.input.length} 字
                      </span>
                      <button
                        onClick={() => update(i, { submitted: true })}
                        disabled={card.input.trim().length === 0}
                        style={{
                          backgroundColor: card.input.trim() ? '#bc004b' : '#d0c3c7', color: '#fff',
                          border: 'none', borderRadius: '8px', padding: '8px 16px',
                          cursor: card.input.trim() ? 'pointer' : 'default',
                          fontFamily: 'Work Sans, sans-serif', fontSize: '12px', fontWeight: 600
                        }}>提交</button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {scrolled && (
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
      )}
    </main>
  )
}
