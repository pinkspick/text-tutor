'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllDays, recordReview, todayKey, type DayEntry } from '../../lib/learnLog'
import { colorPinyinLine } from '../../lib/toneColors'

type Day = { date: string; entry: DayEntry }

const LEVEL_BG: Record<number, string> = { 5: '#fff3e0', 6: '#fde8e8', 7: '#e3f2fd' }
const LEVEL_FG: Record<number, string> = { 5: '#e65100', 6: '#b71c1c', 7: '#0d47a1' }

export default function ReviewPage() {
  const router = useRouter()
  const [days, setDays] = useState<Day[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const recordedRef = useRef(false)

  useEffect(() => {
    const all = getAllDays().filter(d => d.entry.newWords.length > 0)
    setDays(all)
    const today = todayKey()
    const hasToday = all.find(d => d.date === today)
    setSelectedDate(hasToday ? today : (all[0]?.date || ''))
  }, [])

  const dayEntry = useMemo(() => days.find(d => d.date === selectedDate)?.entry, [days, selectedDate])
  const wordsToRecall = dayEntry?.newWords || []

  const result = useMemo(() => {
    if (!submitted) return null
    const written: typeof wordsToRecall = []
    const missed: typeof wordsToRecall = []
    for (const w of wordsToRecall) {
      if (input.includes(w.word)) written.push(w)
      else missed.push(w)
    }
    const score = wordsToRecall.length > 0 ? (written.length / wordsToRecall.length) * 100 : 0
    return { written, missed, score }
  }, [submitted, wordsToRecall, input])

  useEffect(() => {
    if (!result || recordedRef.current || !selectedDate) return
    recordedRef.current = true
    recordReview({
      reviewedDate: selectedDate,
      totalWords: wordsToRecall.length,
      writtenCount: result.written.length,
      score: result.score,
      written: result.written.map(w => ({ word: w.word, pinyin: w.pinyin })),
      missed: result.missed.map(w => ({ word: w.word, pinyin: w.pinyin })),
    })
  }, [result, selectedDate, wordsToRecall])

  function submit() {
    if (input.trim().length === 0) return
    setSubmitted(true)
  }
  function reset() {
    setInput('')
    setSubmitted(false)
    recordedRef.current = false
  }
  function changeDate(d: string) {
    setSelectedDate(d)
    setInput('')
    setSubmitted(false)
    recordedRef.current = false
  }

  return (
    <main style={{paddingBottom: '120px', maxWidth: '700px', margin: '0 auto'}}>
      <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#fff8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px'}}>
        <button onClick={() => router.push('/')} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
          <span className="material-symbols-outlined" style={{color: '#bc004b'}}>arrow_back</span>
        </button>
        <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#bc004b', margin: 0}}>夜间复习</h1>
        <span style={{width: 30}} />
      </header>

      {days.length === 0 ? (
        <section style={{padding: '120px 24px 24px', textAlign: 'center'}}>
          <p style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#7f7478', marginBottom: '12px'}}>还没有学过的新词</p>
          <p style={{fontFamily: 'Newsreader, serif', fontSize: '14px', color: '#4d4447', marginBottom: '24px'}}>去阅读一篇文章，HSK 5+ 词会自动收录</p>
          <button onClick={() => router.push('/')} style={{backgroundColor: '#bc004b', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600, cursor: 'pointer'}}>去阅读 →</button>
        </section>
      ) : (
        <section style={{padding: '96px 24px 24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px'}}>
            <label style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7f7478'}}>选择日期</label>
            <select
              value={selectedDate}
              onChange={e => changeDate(e.target.value)}
              style={{
                fontFamily: 'Work Sans, sans-serif', fontSize: '13px',
                padding: '6px 10px', borderRadius: '8px', border: '1px solid #f0d8d8',
                backgroundColor: '#fff', color: '#25181e', outline: 'none'
              }}
            >
              {days.map(d => (
                <option key={d.date} value={d.date}>{d.date} ({d.entry.newWords.length} 词)</option>
              ))}
            </select>
          </div>

          <p style={{fontFamily: 'Newsreader, serif', fontSize: '17px', color: '#4d4447', marginBottom: '20px', lineHeight: 1.5}}>
            把 <strong style={{color: '#bc004b'}}>{selectedDate}</strong> 学到的 <strong style={{color: '#bc004b'}}>{wordsToRecall.length}</strong> 个新词都写出来 — 不知道的就空着，提交后看漏了哪些。
          </p>

          {!submitted ? (
            <>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="把今天学的词都写在这里，可以用空格、逗号、换行分开..."
                style={{
                  width: '100%', minHeight: '180px', resize: 'vertical',
                  padding: '14px', borderRadius: '12px', border: '2px solid #f0d8d8',
                  fontFamily: 'Newsreader, serif', fontSize: '20px', lineHeight: 1.6,
                  outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box'
                }}
              />
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px'}}>
                <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', color: '#7f7478'}}>{input.length} 字</span>
                <button
                  onClick={submit}
                  disabled={input.trim().length === 0}
                  style={{
                    backgroundColor: input.trim() ? '#bc004b' : '#d0c3c7', color: '#fff',
                    border: 'none', borderRadius: '10px', padding: '12px 24px',
                    cursor: input.trim() ? 'pointer' : 'default',
                    fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600
                  }}>对答案 →</button>
              </div>
            </>
          ) : result && (
            <>
              <div style={{textAlign: 'center', marginBottom: '24px'}}>
                <p style={{fontSize: '52px', marginBottom: '4px'}}>{result.score >= 80 ? '🏆' : result.score >= 50 ? '👏' : '💪'}</p>
                <p style={{fontFamily: 'Newsreader, serif', fontSize: '40px', fontWeight: 700, color: '#bc004b', margin: '0 0 4px'}}>
                  {result.score.toFixed(2)} <span style={{fontSize: '16px', color: '#7f7478', fontWeight: 400}}>/ 100</span>
                </p>
                <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '12px', color: '#7f7478', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0}}>{result.written.length} / {wordsToRecall.length} 写出</p>
              </div>

              {result.missed.length > 0 && (
                <div style={{marginBottom: '24px'}}>
                  <h3 style={{fontFamily: 'Newsreader, serif', fontSize: '20px', color: '#b71c1c', margin: '0 0 12px'}}>漏掉的词 · {result.missed.length}</h3>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                    {result.missed.map(w => (
                      <div key={w.word} style={{backgroundColor: '#fce8e8', border: '1px solid #f5c6cb', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start'}}>
                        <div style={{flex: 1, minWidth: 0}}>
                          <p style={{fontFamily: 'Newsreader, serif', fontSize: '24px', fontWeight: 700, color: '#25181e', margin: '0 0 2px'}}>{w.word}</p>
                          <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '13px', margin: '0 0 2px', fontWeight: 600}}>
                            {colorPinyinLine(w.pinyin).map((syl, si) => (
                              <span key={si} style={{color: syl.color, marginRight: 4}}>{syl.text}</span>
                            ))}
                          </p>
                          <p style={{fontFamily: 'Newsreader, serif', fontSize: '13px', color: '#4d4447', margin: 0, lineHeight: 1.4, overflowWrap: 'anywhere'}}>{w.meaning}</p>
                        </div>
                        <span style={{flexShrink: 0, fontFamily: 'Work Sans, sans-serif', fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', backgroundColor: LEVEL_BG[w.level] || '#eee', color: LEVEL_FG[w.level] || '#444'}}>HSK {w.level === 7 ? '7-9' : w.level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.written.length > 0 && (
                <div style={{marginBottom: '24px'}}>
                  <h3 style={{fontFamily: 'Newsreader, serif', fontSize: '20px', color: '#2e7d32', margin: '0 0 12px'}}>写出的词 · {result.written.length}</h3>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                    {result.written.map(w => (
                      <span key={w.word} style={{backgroundColor: '#e8f5e9', color: '#1b5e20', borderRadius: '6px', padding: '4px 10px', fontFamily: 'Newsreader, serif', fontSize: '17px', fontWeight: 600}}>
                        {w.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={reset} style={{
                width: '100%', backgroundColor: '#fff0f4', color: '#bc004b',
                border: 'none', borderRadius: '10px', padding: '12px',
                cursor: 'pointer',
                fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600
              }}>重新写</button>
            </>
          )}
        </section>
      )}
    </main>
  )
}
