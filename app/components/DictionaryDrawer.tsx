'use client'
import { useState, useEffect } from 'react'

type Props = {
  word: string | null
  pinyin?: string
  onClose: () => void
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  u.rate = 0.85
  window.speechSynthesis.speak(u)
}

export default function DictionaryDrawer({ word, pinyin, onClose }: Props) {
  const [definition, setDefinition] = useState('')
  const [apiPinyin, setApiPinyin] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!word) { setDefinition(''); setApiPinyin(''); return }
    setLoading(true)
    setDefinition('')
    setApiPinyin('')
    fetch('/api/dict?w=' + encodeURIComponent(word))
      .then(r => r.json())
      .then(d => {
        setDefinition(d.definition || '查无此词')
        setApiPinyin(d.pinyin || '')
      })
      .catch(() => setDefinition('查询失败'))
      .finally(() => setLoading(false))
  }, [word])

  function addToVocab() {
    if (!word) return
    const py = pinyin || apiPinyin
    const existing = JSON.parse(localStorage.getItem('vocab_list') || '[]')
    if (existing.find((v: { word: string }) => v.word === word)) {
      alert(word + ' 已在生词本中')
      return
    }
    existing.push({ word, pinyin: py, addedAt: new Date().toISOString() })
    localStorage.setItem('vocab_list', JSON.stringify(existing))
    alert(word + ' 已添加到生词本')
  }

  if (!word) return null
  const displayPinyin = pinyin || apiPinyin

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(37,24,30,0.4)',
        zIndex: 90
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, width: '100%',
        backgroundColor: '#fff8f8', borderRadius: '20px 20px 0 0',
        padding: '24px 24px 32px', zIndex: 100,
        boxShadow: '0 -8px 32px rgba(188,0,75,0.15)',
        maxHeight: '60vh', overflowY: 'auto'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div>
              <p style={{fontFamily: 'Newsreader, serif', fontSize: '40px', fontWeight: 700, margin: '0 0 4px', color: '#25181e'}}>{word}</p>
              {displayPinyin && <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '14px', color: '#bc004b', margin: 0}}>{displayPinyin}</p>}
            </div>
            <button onClick={() => speak(word)} aria-label="播放发音" style={{
              background: '#fff0f4', border: 'none', borderRadius: '50%',
              width: '40px', height: '40px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span className="material-symbols-outlined" style={{color: '#bc004b', fontSize: '22px'}}>volume_up</span>
            </button>
          </div>
          <button onClick={onClose} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px'}}>
            <span className="material-symbols-outlined" style={{color: '#7f7478'}}>close</span>
          </button>
        </div>
        <div style={{minHeight: '60px', marginBottom: '16px'}}>
          {loading
            ? <p style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', color: '#7f7478', margin: 0}}>查询中...</p>
            : <p style={{fontFamily: 'Newsreader, serif', fontSize: '15px', color: '#25181e', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap'}}>{definition}</p>}
        </div>
        <button onClick={addToVocab} style={{
          width: '100%', backgroundColor: '#bc004b', color: '#fff', border: 'none',
          borderRadius: '10px', padding: '12px', fontFamily: 'Work Sans, sans-serif',
          fontSize: '13px', fontWeight: 600, cursor: 'pointer'
        }}>+ 加入生词本</button>
      </div>
    </>
  )
}
