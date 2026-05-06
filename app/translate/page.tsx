'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRandomAdvancedWords } from '../../lib/hsk'
import { recordTranslation } from '../../lib/learnLog'
import { colorPinyinLine } from '../../lib/toneColors'

const QUIZ_SIZE = 10
const TIMER_SECONDS = 30

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

const LEVEL_BG: Record<number, string> = { 5: '#fff3e0', 6: '#fde8e8', 7: '#e3f2fd' }
const LEVEL_FG: Record<number, string> = { 5: '#e65100', 6: '#b71c1c', 7: '#0d47a1' }

export default function TranslatePage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Q[] | null>(null)
  const [inputs, setInputs] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [step, setStep] = useState<'active' | 'graded'>('active')
  const submittedRef = useRef(false)

  useEffect(() => {
    const qs = buildQuestions()
    setQuestions(qs)
    setInputs(new Array(qs.length).fill(''))
    setStep('active')
    setTimeLeft(TIMER_SECONDS)
    submittedRef.current = false
  }, [])

  useEffect(() => {
    if (step !== 'active') return
    if (timeLeft <= 0) { submit(); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, timeLeft])

  function submit() {
    if (submittedRef.current || !questions) return
    submittedRef.current = true
    const graded = questions.map((q, i) => ({
      english: q.english,
      expected: q.expected,
      given: (inputs[i] || '').trim(),
      correct: (inputs[i] || '').trim() === q.expected,
    }))
    const correct = graded.filter(g => g.correct).length
    const score = (correct / questions.length) * 100
    recordTranslation({
      score,
      correct,
      total: questions.length,
      questions: graded,
    })
    setStep('graded')
  }

  function restart() {
    const qs = buildQuestions()
    setQuestions(qs)
    setInputs(new Array(qs.length).fill(''))
    setTimeLeft(TIMER_SECONDS)
    submittedRef.current = false
    setStep('active')
  }

  function setInput(i: number, v: string) {
    setInputs(arr => arr.map((x, idx) => idx === i ? v : x))
  }

  if (!questions) return (
    <main style={{padding: '120px 24px 24px', textAlign: 'center'}}>
      <p style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#7f7478'}}>加载中...</p>
    </main>
  )

  if (step === 'graded') {
    const correct = questions.filter((q, i) => (inputs[i] || '').trim() === q.expected).length
    const score = (correct / questions.length) * 100
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
          <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '12px', color: '#7f7478', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '24px'}}>{correct} / {questions.length} 正确</p>
          <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '32px'}}>
            <button onClick={restart} style={{backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 20px', cursor: 'pointer', fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600}}>再来一组 →</button>
          </div>
          <div style={{textAlign: 'left'}}>
            {questions.map((q, i) => {
              const given = (inputs[i] || '').trim()
              const ok = given === q.expected
              return (
                <div key={i} style={{backgroundColor: ok ? '#e8f5e9' : '#fce8e8', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px'}}>
                    <div style={{flex: 1, minWidth: 0}}>
                      <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', color: '#7f7478', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px'}}>{i + 1}. {q.english}</p>
                      <p style={{fontFamily: 'Newsreader, serif', fontSize: '26px', fontWeight: 700, color: '#25181e', margin: '0 0 2px'}}>
                        {q.expected}
                        {!ok && given && <span style={{fontSize: '14px', color: '#999', fontWeight: 400, marginLeft: 8}}>· 你答 {given}</span>}
                        {!ok && !given && <span style={{fontSize: '14px', color: '#999', fontWeight: 400, marginLeft: 8}}>· 未填</span>}
                      </p>
                      <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '13px', margin: 0, fontWeight: 600}}>
                        {colorPinyinLine(q.pinyin).map((syl, si) => (
                          <span key={si} style={{color: syl.color, marginRight: 4}}>{syl.text}</span>
                        ))}
                      </p>
                    </div>
                    <span style={{flexShrink: 0, fontFamily: 'Work Sans, sans-serif', fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', backgroundColor: LEVEL_BG[q.level] || '#eee', color: LEVEL_FG[q.level] || '#444'}}>HSK {q.level === 7 ? '7-9' : q.level}</span>
                  </div>
                </div>
              )
            })}
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
        <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '18px', color: '#bc004b', margin: 0}}>英中翻译 · {QUIZ_SIZE} 词</h1>
        <button onClick={submit} style={{
          backgroundColor: '#bc004b', color: '#fff', border: 'none',
          borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
          fontFamily: 'Work Sans, sans-serif', fontSize: '12px', fontWeight: 600
        }}>提交</button>
      </header>

      <section style={{padding: '90px 16px 16px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: '16px', padding: '0 8px'}}>
          <span style={{fontFamily: 'Newsreader, serif', fontSize: 28, fontWeight: 700, color: timeLeft <= 10 ? '#bc004b' : '#7f7478', minWidth: 36, textAlign: 'center'}}>{timeLeft}</span>
          <div style={{flex: 1, height: 6, borderRadius: 3, background: '#e8e6e0', overflow: 'hidden'}}>
            <div style={{height: 6, borderRadius: 3, background: timeLeft <= 10 ? '#bc004b' : '#993556', transition: 'width 1s linear', width: timerPct + '%'}} />
          </div>
        </div>

        <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7f7478', textAlign: 'center', marginBottom: '14px'}}>
          根据英文输入对应的汉字 · 30 秒
        </p>

        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {questions.map((q, i) => (
            <div key={i} style={{backgroundColor: '#fff', border: '1px solid #f0d8d8', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', color: '#7f7478', fontWeight: 600, minWidth: 18}}>{i + 1}</span>
              <span style={{flex: 1, fontFamily: 'Newsreader, serif', fontSize: '15px', fontStyle: 'italic', color: '#25181e', overflowWrap: 'anywhere'}}>{q.english}</span>
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
          ))}
        </div>
      </section>
    </main>
  )
}
