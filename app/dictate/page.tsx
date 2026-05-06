'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { recordDictation } from '../../lib/learnLog'

type CurrentText = {
  text: string
  source: string
  title: string
}

const FLASH_SECONDS = 30

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

type Step = 'flash' | 'typing' | 'graded' | 'allDone'

type Result = { expected: string; actual: string; score: number }

export default function DictatePage() {
  const router = useRouter()
  const [data, setData] = useState<CurrentText | null>(null)
  const [phrases, setPhrases] = useState<string[]>([])
  const [idx, setIdx] = useState(0)
  const [step, setStep] = useState<Step>('flash')
  const [input, setInput] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [secondsLeft, setSecondsLeft] = useState(FLASH_SECONDS)

  useEffect(() => {
    const stored = localStorage.getItem('current_text')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CurrentText
        setData(parsed)
        setPhrases(splitPhrases(parsed.text))
      } catch {}
    }
  }, [])

  // Flash timer countdown
  useEffect(() => {
    if (step !== 'flash') return
    if (secondsLeft <= 0) { setStep('typing'); return }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [step, secondsLeft])

  const phrase = phrases[idx] || ''
  const matched = useMemo(() => step === 'graded' ? lcsMatched(phrase, input) : null, [step, phrase, input])
  const score = useMemo(() => {
    if (!matched || phrase.length === 0) return 0
    return (matched.filter(Boolean).length / phrase.length) * 100
  }, [matched, phrase])
  const avgScore = results.length > 0 ? results.reduce((a, b) => a + b.score, 0) / results.length : null

  function readyEarly() { setStep('typing'); setSecondsLeft(0) }
  function submit() {
    if (input.trim().length === 0) return
    const sc = phrase.length > 0 ? (lcsMatched(phrase, input).filter(Boolean).length / phrase.length) * 100 : 0
    const newResults = [...results, { expected: phrase, actual: input, score: sc }]
    setResults(newResults)
    setStep('graded')
  }
  function next() {
    if (idx + 1 < phrases.length) {
      setIdx(idx + 1)
      setInput('')
      setSecondsLeft(FLASH_SECONDS)
      setStep('flash')
    } else {
      setStep('allDone')
    }
  }
  function redo() {
    setStep('typing')
    setInput('')
    setResults(r => r.slice(0, -1))
  }
  function restart() {
    setIdx(0)
    setInput('')
    setResults([])
    setSecondsLeft(FLASH_SECONDS)
    setStep('flash')
  }

  // Log to learnLog when allDone
  const loggedRef = useRef(false)
  useEffect(() => {
    if (step !== 'allDone' || !data || loggedRef.current || results.length === 0) return
    loggedRef.current = true
    const avg = results.reduce((a, b) => a + b.score, 0) / results.length
    recordDictation({
      source: data.source,
      title: data.title,
      totalPhrases: phrases.length,
      submittedCount: results.length,
      avgScore: avg,
      perPhrase: results,
    })
  }, [step, data, results, phrases])

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

  if (step === 'allDone') {
    return (
      <main style={{maxWidth: '700px', margin: '0 auto', paddingBottom: '120px'}}>
        <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#fff8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px'}}>
          <button onClick={() => router.push('/analyze')} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
            <span className="material-symbols-outlined" style={{color: '#bc004b'}}>arrow_back</span>
          </button>
          <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#bc004b', margin: 0}}>听写结果</h1>
          <span style={{width: 30}} />
        </header>
        <div style={{padding: '96px 24px 24px', textAlign: 'center'}}>
          <p style={{fontSize: '56px', marginBottom: '8px'}}>{(avgScore ?? 0) >= 80 ? '🏆' : (avgScore ?? 0) >= 50 ? '👏' : '💪'}</p>
          <p style={{fontFamily: 'Newsreader, serif', fontSize: '40px', fontWeight: 700, color: '#bc004b', margin: '0 0 4px'}}>
            {(avgScore ?? 0).toFixed(2)} <span style={{fontSize: '16px', color: '#7f7478', fontWeight: 400}}>/ 100</span>
          </p>
          <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '12px', color: '#7f7478', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '32px'}}>平均分 · {results.length} 句</p>
          <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '32px', flexWrap: 'wrap'}}>
            <button onClick={restart} style={{backgroundColor: '#fff0f4', color: '#bc004b', border: 'none', borderRadius: '10px', padding: '12px 18px', cursor: 'pointer', fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600}}>重新开始</button>
            <button onClick={() => router.push('/')} style={{backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 18px', cursor: 'pointer', fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600}}>选新闻 →</button>
          </div>
          <div style={{textAlign: 'left'}}>
            <h3 style={{fontFamily: 'Newsreader, serif', fontSize: '18px', color: '#bc004b', margin: '0 0 12px'}}>详情</h3>
            {results.map((r, i) => {
              const m = lcsMatched(r.expected, r.actual)
              return (
                <div key={i} style={{backgroundColor: '#fff', border: '1px solid #f0d8d8', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px'}}>
                    <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', color: '#7f7478', fontWeight: 600}}>第 {i + 1} 句</span>
                    <span style={{fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: 700, color: r.score >= 80 ? '#2e7d32' : r.score >= 50 ? '#fb8c00' : '#bc004b'}}>{r.score.toFixed(2)} / 100</span>
                  </div>
                  <p style={{fontFamily: 'Newsreader, serif', fontSize: '15px', lineHeight: 1.6, margin: 0, overflowWrap: 'anywhere'}}>
                    {r.expected.split('').map((ch, ci) => (
                      <span key={ci} style={{color: m[ci] ? '#2e7d32' : '#b71c1c', backgroundColor: m[ci] ? 'transparent' : '#fce8e8', borderRadius: 3, padding: m[ci] ? 0 : '0 2px'}}>{ch}</span>
                    ))}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{paddingBottom: '120px', maxWidth: '700px', margin: '0 auto'}}>
      <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#fff8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px'}}>
        <button onClick={() => router.push('/analyze')} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
          <span className="material-symbols-outlined" style={{color: '#bc004b'}}>arrow_back</span>
        </button>
        <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '18px', color: '#bc004b', margin: 0}}>听写 · {idx + 1}/{phrases.length}</h1>
        <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '12px', color: '#bc004b', fontWeight: 600, minWidth: 50, textAlign: 'right'}}>
          {avgScore !== null ? avgScore.toFixed(1) : '—'}
          <span style={{color: '#7f7478', fontWeight: 400, fontSize: 10}}>/100</span>
        </span>
      </header>

      <section style={{padding: '96px 24px 24px'}}>
        {step === 'flash' && (
          <>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: '20px'}}>
              <span style={{fontFamily: 'Newsreader, serif', fontSize: 32, fontWeight: 700, color: secondsLeft <= 5 ? '#bc004b' : '#7f7478', minWidth: 36, textAlign: 'center'}}>{secondsLeft}</span>
              <div style={{flex: 1, maxWidth: 220, height: 4, borderRadius: 2, background: '#e8e6e0', overflow: 'hidden'}}>
                <div style={{height: 4, borderRadius: 2, background: '#bc004b', transition: 'width 1s linear', width: ((secondsLeft / FLASH_SECONDS) * 100) + '%'}} />
              </div>
            </div>
            <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7f7478', textAlign: 'center', marginBottom: '20px'}}>读熟、听熟，倒计时结束后开始默写</p>
            <div style={{backgroundColor: '#fff', border: '1px solid #f0d8d8', borderRadius: '14px', padding: '24px 20px', marginBottom: '16px'}}>
              <p style={{fontFamily: 'Newsreader, serif', fontSize: '24px', fontWeight: 600, lineHeight: 1.5, color: '#25181e', margin: 0, overflowWrap: 'anywhere'}}>{phrase}</p>
            </div>
            <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={() => speak(phrase)} aria-label="朗读" style={{
                backgroundColor: '#fff0f4', color: '#bc004b', border: 'none', borderRadius: '10px',
                padding: '12px 16px', cursor: 'pointer',
                fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <span className="material-symbols-outlined" style={{fontSize: 18}}>volume_up</span>
                朗读
              </button>
              <button onClick={readyEarly} style={{
                flex: 1, backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '10px',
                padding: '12px 20px', cursor: 'pointer',
                fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600
              }}>我准备好了 →</button>
            </div>
          </>
        )}

        {step === 'typing' && (
          <>
            <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7f7478', textAlign: 'center', marginBottom: '16px'}}>凭记忆输入这句话（标点也写）</p>
            <textarea
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="..."
              style={{
                width: '100%', minHeight: '160px', resize: 'vertical',
                padding: '16px', borderRadius: '12px', border: '2px solid #f0d8d8',
                fontFamily: 'Newsreader, serif', fontSize: '20px', lineHeight: 1.5,
                outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box'
              }}
            />
            <div style={{display: 'flex', gap: '10px', marginTop: '12px'}}>
              <button onClick={() => speak(phrase)} aria-label="再听一次" style={{
                backgroundColor: '#fff0f4', color: '#bc004b', border: 'none', borderRadius: '10px',
                padding: '12px 16px', cursor: 'pointer',
                fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <span className="material-symbols-outlined" style={{fontSize: 18}}>volume_up</span>
                再听
              </button>
              <button
                onClick={submit}
                disabled={input.trim().length === 0}
                style={{
                  flex: 1, backgroundColor: input.trim() ? '#bc004b' : '#d0c3c7', color: '#fff',
                  border: 'none', borderRadius: '10px', padding: '12px 20px',
                  cursor: input.trim() ? 'pointer' : 'default',
                  fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600
                }}>提交 →</button>
            </div>
          </>
        )}

        {step === 'graded' && matched && (
          <>
            <div style={{textAlign: 'center', marginBottom: '24px'}}>
              <p style={{fontFamily: 'Newsreader, serif', fontSize: '48px', fontWeight: 700, color: score >= 80 ? '#2e7d32' : score >= 50 ? '#fb8c00' : '#bc004b', margin: '0 0 4px'}}>
                {score.toFixed(2)} <span style={{fontSize: '20px', color: '#7f7478'}}>/ 100</span>
              </p>
              <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#7f7478', margin: 0}}>本句正确率</p>
            </div>

            <div style={{backgroundColor: '#fff', border: '1px solid #f0d8d8', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px'}}>
              <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7f7478', margin: '0 0 6px'}}>原句</p>
              <p style={{fontFamily: 'Newsreader, serif', fontSize: '20px', lineHeight: 1.6, margin: 0, overflowWrap: 'anywhere'}}>
                {phrase.split('').map((ch, i) => (
                  <span key={i} style={{
                    color: matched[i] ? '#2e7d32' : '#b71c1c',
                    backgroundColor: matched[i] ? 'transparent' : '#fce8e8',
                    borderRadius: 3,
                    padding: matched[i] ? 0 : '0 2px',
                  }}>{ch}</span>
                ))}
              </p>
            </div>

            <div style={{backgroundColor: '#fff8f0', border: '1px solid #f0d8d8', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px'}}>
              <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7f7478', margin: '0 0 6px'}}>你的输入</p>
              <p style={{fontFamily: 'Newsreader, serif', fontSize: '17px', lineHeight: 1.6, margin: 0, color: '#4d4447', overflowWrap: 'anywhere'}}>{input || '（空）'}</p>
            </div>

            <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={redo} style={{
                backgroundColor: '#fff0f4', color: '#bc004b', border: 'none', borderRadius: '10px',
                padding: '14px 18px', cursor: 'pointer',
                fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600
              }}>重做</button>
              <button onClick={next} style={{
                flex: 1, backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '10px',
                padding: '14px 20px', cursor: 'pointer',
                fontFamily: 'Work Sans, sans-serif', fontSize: '14px', fontWeight: 600
              }}>{idx + 1 >= phrases.length ? '完成 →' : `下一句 (${idx + 2}/${phrases.length}) →`}</button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
