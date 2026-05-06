'use client'
import { useState, useEffect, useRef } from 'react'
import { recordQuiz } from '../../lib/learnLog'

export type QuizQuestion = {
  word: string
  syl1Base: string
  syl2Base: string
  tone1: number
  tone2: number
  pinyin: string
  english: string
}

type QuizResult = {
  question: QuizQuestion
  chosenTone1: number
  chosenTone2: number
  correct: boolean
}

const TONES = [
  { label: '第一声 ā', cls: 't1', tone: 1 },
  { label: '第二声 á', cls: 't2', tone: 2 },
  { label: '第三声 ǎ', cls: 't3', tone: 3 },
  { label: '第四声 à', cls: 't4', tone: 4 },
  { label: '轻声 a',  cls: 't0', tone: 0 },
]

const TONE_COLORS: Record<string, { text: string, bg: string, headerText: string }> = {
  t1: { text: '#e53935', bg: '#fde8e8', headerText: '#b71c1c' },
  t2: { text: '#fb8c00', bg: '#fff3e0', headerText: '#e65100' },
  t3: { text: '#2e7d32', bg: '#e8f5e9', headerText: '#1b5e20' },
  t4: { text: '#1e88e5', bg: '#e3f2fd', headerText: '#0d47a1' },
  t0: { text: '#7f7478', bg: '#f5f5f5', headerText: '#444441' },
}

const toneVowelMap: Record<string, string[]> = {
  'a': ['a','ā','á','ǎ','à'],
  'e': ['e','ē','é','ě','è'],
  'i': ['i','ī','í','ǐ','ì'],
  'o': ['o','ō','ó','ǒ','ò'],
  'u': ['u','ū','ú','ǔ','ù'],
  'ü': ['ü','ǖ','ǘ','ǚ','ǜ'],
}

function applyTone(base: string, tone: number): string {
  if (tone === 0) return base
  const vowels = ['a','e','i','o','u','ü']
  for (const v of vowels) {
    if (base.includes(v)) return base.replace(v, toneVowelMap[v]?.[tone] || v)
  }
  return base
}

const STAGE_SIZE = 10

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

function saveVocab(word: string, pinyin: string) {
  const existing = JSON.parse(localStorage.getItem('vocab_list') || '[]')
  if (!existing.find((v: { word: string }) => v.word === word)) {
    existing.push({ word, pinyin, addedAt: new Date().toISOString() })
    localStorage.setItem('vocab_list', JSON.stringify(existing))
    alert(word + ' 已添加到生词本')
  } else alert(word + ' 已在生词本中')
}

type Props = {
  questions: QuizQuestion[]
  title: string
  onExit: () => void
  onRestart: () => void
  audio?: boolean
  source: string
}

export default function QuizRunner({ questions, title, onExit, onRestart, audio = false, source }: Props) {
  const [stage, setStage] = useState(0)
  const [currentQ, setCurrentQ] = useState(0)
  const [stageResults, setStageResults] = useState<QuizResult[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(10)
  const [wordDef, setWordDef] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [audioOn, setAudioOn] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!audio || typeof window === 'undefined') return
    setAudioOn(sessionStorage.getItem('quizAudio') !== 'off')
  }, [audio])

  function toggleAudio() {
    const next = !audioOn
    setAudioOn(next)
    if (typeof window !== 'undefined') sessionStorage.setItem('quizAudio', next ? 'on' : 'off')
    if (!next && typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
  }

  const stageQuestions = questions.slice(stage * STAGE_SIZE, (stage + 1) * STAGE_SIZE)
  const totalStages = Math.max(1, Math.ceil(questions.length / STAGE_SIZE))
  const q = stageQuestions[currentQ]

  useEffect(() => {
    if (showSummary || !q) return
    fetch('/api/dict?w=' + encodeURIComponent(q.word))
      .then(r => r.json()).then(d => setWordDef(d.definition || '')).catch(() => {})
    if (audio && audioOn) speak(q.word)
  }, [currentQ, stage, showSummary, q, audio, audioOn])

  useEffect(() => {
    if (showSummary || answered || !q) return
    if (timeLeft <= 0) { handleAnswer(0, 0); return }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [timeLeft, answered, showSummary, q])

  function handleAnswer(t1: number, t2: number) {
    if (answered || !q) return
    if (timerRef.current) clearTimeout(timerRef.current)
    const key = t1 + '-' + t2
    setSelected(key)
    setAnswered(true)
    const correct = t1 === q.tone1 && t2 === q.tone2
    const newResults = [...stageResults, { question: q, chosenTone1: t1, chosenTone2: t2, correct }]
    setStageResults(newResults)
    setTimeout(() => {
      if (currentQ + 1 >= stageQuestions.length) {
        const correctCount = newResults.filter(r => r.correct).length
        const total = newResults.length
        recordQuiz({
          source,
          score: total > 0 ? Number(((correctCount / total) * 100).toFixed(2)) : 0,
          correct: correctCount,
          total,
          wrongs: newResults.filter(r => !r.correct).map(r => ({
            word: r.question.word,
            pinyin: r.question.pinyin,
            correctTones: [r.question.tone1, r.question.tone2],
            chosenTones: [r.chosenTone1, r.chosenTone2],
          })),
        })
        setShowSummary(true)
      } else {
        setCurrentQ(qq => qq + 1)
        setSelected(null)
        setAnswered(false)
        setTimeLeft(10)
        setWordDef('')
      }
    }, 1400)
  }

  function nextStage() {
    setStage(s => s + 1)
    setCurrentQ(0)
    setStageResults([])
    setSelected(null)
    setAnswered(false)
    setTimeLeft(10)
    setShowSummary(false)
    setWordDef('')
  }

  if (!q && !showSummary) {
    return (
      <main style={{paddingTop: '120px', textAlign: 'center'}}>
        <p style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#4d4447'}}>没有可用题目</p>
        <button onClick={onExit} style={{marginTop: '16px', backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontFamily: 'Work Sans, sans-serif', cursor: 'pointer'}}>返回</button>
      </main>
    )
  }

  if (showSummary) {
    const correct = stageResults.filter(r => r.correct).length
    const isLastStage = stage + 1 >= totalStages
    return (
      <main style={{maxWidth: '700px', margin: '0 auto', paddingBottom: '120px'}}>
        <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#fff8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px'}}>
          <button onClick={onExit} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
            <span className="material-symbols-outlined" style={{color: '#bc004b'}}>arrow_back</span>
          </button>
          <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#bc004b', margin: 0}}>第 {stage + 1} 关 结果</h1>
          <span style={{width: '40px'}} />
        </header>
        <div style={{padding: '80px 24px 24px', textAlign: 'center'}}>
          <p style={{fontSize: '56px', marginBottom: '8px'}}>{correct / stageResults.length >= 0.8 ? '🏆' : correct / stageResults.length >= 0.5 ? '👏' : '💪'}</p>
          <h2 style={{fontFamily: 'Newsreader, serif', fontSize: '32px', marginBottom: '4px'}}>{(correct / stageResults.length * 100).toFixed(2)} / 100</h2>
          <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '13px', color: '#4d4447', marginBottom: '4px'}}>第 {stage + 1} 关 / 共 {totalStages} 关</p>
          <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '13px', color: '#bc004b', marginBottom: '32px', fontWeight: 600}}>{correct} / {stageResults.length} 正确</p>
          <div style={{display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '40px', flexWrap: 'wrap'}}>
            <button onClick={onRestart} style={{backgroundColor: '#fff0f4', color: '#bc004b', border: 'none', borderRadius: '8px', padding: '12px 20px', fontFamily: 'Work Sans, sans-serif', cursor: 'pointer', fontSize: '13px', fontWeight: 600}}>重新开始</button>
            {!isLastStage && <button onClick={nextStage} style={{backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 20px', fontFamily: 'Work Sans, sans-serif', cursor: 'pointer', fontSize: '13px', fontWeight: 600}}>下一关 ({stage + 2}/{totalStages}) →</button>}
            {isLastStage && <button onClick={onExit} style={{backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 20px', fontFamily: 'Work Sans, sans-serif', cursor: 'pointer', fontSize: '13px', fontWeight: 600}}>完成 🎉</button>}
          </div>
          <div style={{textAlign: 'left'}}>
            <h3 style={{fontFamily: 'Newsreader, serif', fontSize: '20px', marginBottom: '16px', color: '#bc004b'}}>本关详情</h3>
            {stageResults.map((r, i) => {
              const correctTone1Cls = TONES.find(t => t.tone === r.question.tone1)?.cls || 't1'
              const correctTone2Cls = TONES.find(t => t.tone === r.question.tone2)?.cls || 't1'
              return (
                <div key={i} style={{backgroundColor: r.correct ? '#e8f5e9' : '#fce8e8', borderRadius: '12px', padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                    <span style={{fontSize: '20px'}}>{r.correct ? '✓' : '✗'}</span>
                    <div>
                      <p style={{fontFamily: 'Newsreader, serif', fontSize: '28px', fontWeight: 700, margin: '0 0 4px'}}>{r.question.word}</p>
                      <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '14px', margin: 0}}>
                        <span style={{color: TONE_COLORS[correctTone1Cls].text, fontWeight: 700}}>{applyTone(r.question.syl1Base, r.question.tone1)}</span>
                        {' '}
                        <span style={{color: TONE_COLORS[correctTone2Cls].text, fontWeight: 700}}>{applyTone(r.question.syl2Base, r.question.tone2)}</span>
                        {!r.correct && r.chosenTone1 > 0 && <span style={{color: '#999', fontSize: '12px'}}> · 你选了 {applyTone(r.question.syl1Base, r.chosenTone1)} {applyTone(r.question.syl2Base, r.chosenTone2)}</span>}
                        {!r.correct && r.chosenTone1 === 0 && <span style={{color: '#999', fontSize: '12px'}}> · 超时</span>}
                      </p>
                    </div>
                  </div>
                  {!r.correct && <button onClick={() => saveVocab(r.question.word, r.question.pinyin)} style={{backgroundColor: '#fff', border: '1px solid #bc004b', color: '#bc004b', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontFamily: 'Work Sans, sans-serif', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap'}}>+ 生词本</button>}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    )
  }

  const timerPct = Math.round((timeLeft / 10) * 100)
  return (
    <main style={{maxWidth: '700px', margin: '0 auto', paddingBottom: '40px'}}>
      <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#fff8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px'}}>
        <button onClick={onExit} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
          <span className="material-symbols-outlined" style={{color: '#bc004b'}}>arrow_back</span>
        </button>
        <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '18px', color: '#bc004b', margin: 0}}>{title} · {currentQ+1}/{stageQuestions.length}</h1>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          {audio && (
            <button onClick={toggleAudio} aria-label={audioOn ? '关闭发音' : '开启发音'} style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex'}}>
              <span className="material-symbols-outlined" style={{color: audioOn ? '#bc004b' : '#bdb1b5', fontSize: 22}}>{audioOn ? 'volume_up' : 'volume_off'}</span>
            </button>
          )}
          <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '12px', color: '#4d4447'}}>{stage+1}/{totalStages}</span>
        </div>
      </header>

      <div style={{padding: '80px 8px 16px', fontFamily: 'sans-serif', maxWidth: 700, margin: '0 auto'}}>
        <div style={{textAlign: 'center', marginBottom: '1.25rem'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12}}>
            <div style={{fontSize: 72, fontWeight: 500, letterSpacing: 4, lineHeight: 1.1}}>{q.word}</div>
            {audio && audioOn && (
              <button onClick={() => speak(q.word)} aria-label="播放发音" style={{
                background: '#fff0f4', border: 'none', borderRadius: '50%',
                width: 44, height: 44, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span className="material-symbols-outlined" style={{color: '#bc004b', fontSize: 24}}>volume_up</span>
              </button>
            )}
          </div>
          {wordDef && <div style={{fontSize: 13, color: '#7f7478', fontStyle: 'italic', marginTop: '6px', fontFamily: 'Newsreader, serif'}}>{wordDef}</div>}
        </div>

        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: '1.5rem'}}>
          <span style={{fontSize: 22, fontWeight: 500, color: '#993556', minWidth: 24}}>{timeLeft}</span>
          <div style={{width: 180, height: 4, borderRadius: 2, background: '#e8e6e0', overflow: 'hidden'}}>
            <div style={{height: 4, borderRadius: 2, background: '#993556', transition: 'width 1s linear', width: timerPct + '%'}} />
          </div>
        </div>

        <table style={{width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 3}}>
          <colgroup>
            <col style={{width: '9%'}} />
            <col style={{width: '18.2%'}} />
            <col style={{width: '18.2%'}} />
            <col style={{width: '18.2%'}} />
            <col style={{width: '18.2%'}} />
            <col style={{width: '18.2%'}} />
          </colgroup>
          <thead>
            <tr>
              <th style={{padding: '2px', verticalAlign: 'middle'}}>
                <span style={{fontSize: 9, color: '#888', fontWeight: 400}}>↓→</span>
              </th>
              {TONES.map((t, ci) => (
                <th key={ci} style={{fontWeight: 600, padding: '6px 0', borderRadius: 6, textAlign: 'center', background: TONE_COLORS[t.cls].bg, color: TONE_COLORS[t.cls].headerText, fontSize: 14}}>
                  {applyTone('a', t.tone)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TONES.map((rowTone, ri) => (
              <tr key={ri}>
                <th style={{fontSize: 14, fontWeight: 600, padding: '6px 0', borderRadius: 6, textAlign: 'center', background: TONE_COLORS[rowTone.cls].bg, color: TONE_COLORS[rowTone.cls].headerText}}>
                  {applyTone('a', rowTone.tone)}
                </th>
                {TONES.map((colTone, ci) => {
                  const key = rowTone.tone + '-' + colTone.tone
                  const isSelected = selected === key
                  const isCorrect = rowTone.tone === q.tone1 && colTone.tone === q.tone2
                  const s1 = applyTone(q.syl1Base, rowTone.tone)
                  const s2 = applyTone(q.syl2Base, colTone.tone)
                  let bg = '#fff'
                  let border = '0.5px solid rgba(0,0,0,0.12)'
                  if (answered && isCorrect) { bg = '#e8f5e9'; border = '2px solid #2e7d32' }
                  else if (answered && isSelected && !isCorrect) { bg = '#fce8e8'; border = '2px solid #e53935' }
                  else if (isSelected) { bg = '#fbeaf0'; border = '2px solid #993556' }
                  return (
                    <td key={ci} style={{padding: 0}}>
                      <button onClick={() => handleAnswer(rowTone.tone, colTone.tone)} disabled={answered} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                        padding: '10px 2px', borderRadius: 8, border, background: bg,
                        cursor: answered ? 'default' : 'pointer', width: '100%', fontSize: 13,
                        outline: 'none', transition: 'border-color 0.1s, background 0.1s', lineHeight: 1.2
                      }}>
                        <span style={{color: TONE_COLORS[rowTone.cls].text, fontWeight: 600}}>{s1}</span>
                        <span style={{color: TONE_COLORS[colTone.cls].text, fontWeight: 600}}>{s2}</span>
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
