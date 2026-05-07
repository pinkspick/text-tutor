'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRandomAdvancedWords } from '../../lib/hsk'
import { recordTranslation } from '../../lib/learnLog'
import { colorPinyinLine } from '../../lib/toneColors'

const QUIZ_SIZE = 10
const TIMER_SECONDS = 60

type Q = {
  english: string
  expected: string
  pinyin: string
  level: number
}

function pickEnglish(meaning: string): string {
  const first = meaning.split(/[;；]/)[0].trim()
  return first.replace(/^(to\s+|a\s+|an\s+|the\s+)/i, '').trim().slice(0, 50)
}

function buildQuestions(): Q[] {
  const pool = getRandomAdvancedWords(QUIZ_SIZE * 3)
  const out: Q[] = []
  const seen = new Set<string>()
  for (const w of pool) {
    if (out.length >= QUIZ_SIZE) break
    if (seen.has(w.word)) continue
    const en = pickEnglish(w.meaning)
    if (!en || en.length < 2) continue
    seen.add(w.word)
    out.push({ english: en, expected: w.word, pinyin: w.pinyin, level: w.level })
  }
  return out
}

function questionScore(q: Q, given: string): number {
  if (q.expected.length === 0) return 0
  let matched = 0
  const g = given.trim()
  for (let i = 0; i < q.expected.length; i++) {
    if (i < g.length && g[i] === q.expected[i]) matched++
  }
  return matched / q.expected.length
}

const LEVEL_BG: Record<number, string> = { 5: '#fff3e0', 6: '#fde8e8', 7: '#e3f2fd' }
const LEVEL_FG: Record<number, string> = { 5: '#e65100', 6: '#b71c1c', 7: '#0d47a1' }

function scoreColor(s: number): string {
  if (s >= 1) return '#2e7d32'
  if (s > 0) return '#fb8c00'
  return '#bdb1b5'
}
function scoreBg(s: number): string {
  if (s >= 1) return '#e8f5e9'
  if (s > 0) return '#fff3e0'
  return '#fff'
}

export default function TranslatePage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Q[] | null>(null)
  const [inputs, setInputs] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [step, setStep] = useState<'active' | 'finished'>('active')
  const [timerOn, setTimerOn] = useState(true)
  const submittedRef = useRef(false)

  function setupNewRound() {
    const qs = buildQuestions()
    setQuestions(qs)
    setInputs(new Array(qs.length).fill(''))
    setStep('active')
    setTimeLeft(TIMER_SECONDS)
    submittedRef.current = false
    if (typeof window !== 'undefined') {
      setTimerOn(sessionStorage.getItem('translateTimer') !== 'off')
    }
  }

  useEffect(() => { setupNewRound() }, [])

  useEffect(() => {
    if (step !== 'active' || !timerOn) return
    if (timeLeft <= 0) { submit(); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, timeLeft, timerOn])

  function toggleTimer() {
    const next = !timerOn
    setTimerOn(next)
    if (typeof window !== 'undefined') sessionStorage.setItem('translateTimer', next ? 'on' : 'off')
    if (next) setTimeLeft(TIMER_SECONDS)
  }

  function submit() {
    if (submittedRef.current || !questions) return
    submittedRef.current = true
    const graded = questions.map((q, i) => {
      const given = (inputs[i] || '').trim()
      const partial = questionScore(q, given)
      return { english: q.english, expected: q.expected, given, correct: partial >= 1, partial }
    })
    const correct = graded.filter(g => g.correct).length
    const score = (graded.reduce((s, g) => s + g.partial, 0) / graded.length) * 100
    recordTranslation({
      score,
      correct,
      total: questions.length,
      questions: graded.map(({english, expected, given, correct}) => ({english, expected, given, correct})),
    })
    setStep('finished')
  }

  function setInput(i: number, v: string) {
    setInputs(arr => arr.map((x, idx) => idx === i ? v : x))
  }

  const liveTotal = useMemo(() => {
    if (!questions) return 0
    return (questions.reduce((s, q, i) => s + questionScore(q, (inputs[i] || '').trim()), 0) / questions.length) * 100
  }, [questions, inputs])

  if (!questions) return (
    <main style={{padding: '120px 24px 24px', textAlign: 'center'}}>
      <p style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#7f7478'}}>加载中...</p>
    </main>
  )

  if (step === 'finished') {
    const finalGraded = questions.map((q, i) => ({ q, given: (inputs[i] || '').trim(), partial: questionScore(q, (inputs[i] || '').trim()) }))
    const correct = finalGraded.filter(g => g.partial >= 1).length
    const partials = finalGraded.filter(g => g.partial > 0 && g.partial < 1).length
    const score = liveTotal
    return (
      <main style={{paddingBottom: '120px', maxWidth: '700px', margin: '0 auto'}}>
        <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#fff8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px'}}>
          <button onClick={() => router.push('/')} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
            <span className="material-symbols-outlined" style={{color: '#bc004b'}}>arrow_back</span>
          </button>
          <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#bc004b', margin: 0}}>英中翻译</h1>
          <span style={{width: 30}} />
        </header>
        <div style={{padding: '96px 24px 24px', textAlign: 'center'}}>
          <p style={{fontSize: '56px', marginBottom: '8px'}}>{score >= 80 ? '🏆' : score >= 50 ? '👏' : '💪'}</p>
          <p style={{fontFamily: 'Newsreader, serif', fontSize: '44px', fontWeight: 700, color: '#bc004b', margin: '0 0 4px'}}>
            {score.toFixed(2)} <span style={{fontSize: '18px', color: '#7f7478', fontWeight: 400}}>/ 100</span>
          </p>
          <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '12px', color: '#7f7478', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '24px'}}>
            {correct} 全对 · {partials} 部分对 · {questions.length - correct - partials} 错
          </p>
          <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '32px'}}>
            <button onClick={setupNewRound} style={{backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 20px', cursor: 'pointer', fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600}}>新开始 →</button>
          </div>
          <div style={{textAlign: 'left'}}>
            {finalGraded.map(({q, given, partial}, i) => (
              <div key={i} style={{backgroundColor: scoreBg(partial), borderRadius: '12px', padding: '12px 14px', marginBottom: '8px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px'}}>
                  <div style={{flex: 1, minWidth: 0}}>
                    <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', color: '#7f7478', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px'}}>{i + 1}. {q.english}</p>
                    <p style={{fontFamily: 'Newsreader, serif', fontSize: '26px', fontWeight: 700, margin: '0 0 2px'}}>
                      {q.expected.split('').map((ch, ci) => {
                        const ok = ci < given.length && given[ci] === ch
                        return <span key={ci} style={{color: ok ? '#2e7d32' : '#25181e'}}>{ch}</span>
                      })}
                      {given && given !== q.expected && (
                        <span style={{fontSize: '14px', color: '#999', fontWeight: 400, marginLeft: 8}}>· 你答 {given}</span>
                      )}
                      {!given && <span style={{fontSize: '14px', color: '#999', fontWeight: 400, marginLeft: 8}}>· 未填</span>}
                    </p>
                    <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '13px', margin: 0, fontWeight: 600}}>
                      {colorPinyinLine(q.pinyin).map((syl, si) => (
                        <span key={si} style={{color: syl.color, marginRight: 4}}>{syl.text}</span>
                      ))}
                      <span style={{marginLeft: 10, color: scoreColor(partial), fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: 14}}>{(partial * 100).toFixed(0)}%</span>
                    </p>
                  </div>
                  <span style={{flexShrink: 0, fontFamily: 'Work Sans, sans-serif', fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', backgroundColor: LEVEL_BG[q.level] || '#eee', color: LEVEL_FG[q.level] || '#444'}}>HSK {q.level === 7 ? '7-9' : q.level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  const timerPct = (timeLeft / TIMER_SECONDS) * 100

  return (
    <main style={{paddingBottom: '120px', maxWidth: '700px', margin: '0 auto'}}>
      <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#fff8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px'}}>
        <button onClick={() => router.push('/')} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
          <span className="material-symbols-outlined" style={{color: '#bc004b'}}>arrow_back</span>
        </button>
        <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '18px', color: '#bc004b', margin: 0}}>英中 · {liveTotal.toFixed(1)}/100</h1>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <button onClick={toggleTimer} aria-label={timerOn ? '关闭计时' : '开启计时'} style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex'}}>
            <span className="material-symbols-outlined" style={{color: timerOn ? '#bc004b' : '#bdb1b5', fontSize: 22}}>{timerOn ? 'timer' : 'timer_off'}</span>
          </button>
          <button onClick={submit} style={{
            backgroundColor: '#bc004b', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
            fontFamily: 'Work Sans, sans-serif', fontSize: '12px', fontWeight: 600
          }}>提交</button>
        </div>
      </header>

      <section style={{padding: '90px 16px 16px'}}>
        {timerOn && (
          <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: '12px', padding: '0 8px'}}>
            <span style={{fontFamily: 'Newsreader, serif', fontSize: 24, fontWeight: 700, color: timeLeft <= 10 ? '#bc004b' : '#7f7478', minWidth: 32, textAlign: 'center'}}>{timeLeft}</span>
            <div style={{flex: 1, height: 6, borderRadius: 3, background: '#e8e6e0', overflow: 'hidden'}}>
              <div style={{height: 6, borderRadius: 3, background: timeLeft <= 10 ? '#bc004b' : '#993556', transition: 'width 1s linear', width: timerPct + '%'}} />
            </div>
          </div>
        )}

        <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7f7478', textAlign: 'center', marginBottom: '14px'}}>
          可以多次修改 · 部分对也得分 · {timerOn ? `${TIMER_SECONDS} 秒到点自动提交` : '不计时'}
        </p>

        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          {questions.map((q, i) => {
            const given = (inputs[i] || '').trim()
            const score = questionScore(q, given)
            const showLive = given.length > 0
            return (
              <div key={i} style={{
                backgroundColor: showLive ? scoreBg(score) : '#fff',
                border: '1px solid #f0d8d8', borderRadius: '12px',
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', color: '#7f7478', fontWeight: 600, minWidth: 18}}>{i + 1}</span>
                <span style={{flex: 1, fontFamily: 'Newsreader, serif', fontSize: '15px', fontStyle: 'italic', color: '#25181e', overflowWrap: 'anywhere'}}>{q.english}</span>
                {showLive && (
                  <span style={{
                    fontFamily: 'Newsreader, serif', fontSize: '13px', fontWeight: 700,
                    color: scoreColor(score), minWidth: 28, textAlign: 'right'
                  }}>{(score * 100).toFixed(0)}%</span>
                )}
                <input
                  value={inputs[i] || ''}
                  onChange={e => setInput(i, e.target.value)}
                  placeholder="..."
                  style={{
                    width: '110px', padding: '8px 10px', borderRadius: '8px',
                    border: '1.5px solid #f0d8d8',
                    fontFamily: 'Newsreader, serif', fontSize: '22px', fontWeight: 600,
                    textAlign: 'center', outline: 'none', backgroundColor: '#fff8f8'
                  }}
                />
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
