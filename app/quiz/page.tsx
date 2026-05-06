'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getRandomAdvancedWords } from '../../lib/hsk'
import QuizRunner, { QuizQuestion } from '../components/QuizRunner'

const toneMarkMap: Record<string, string> = {
  'ā':'a','á':'a','ǎ':'a','à':'a',
  'ē':'e','é':'e','ě':'e','è':'e',
  'ī':'i','í':'i','ǐ':'i','ì':'i',
  'ō':'o','ó':'o','ǒ':'o','ò':'o',
  'ū':'u','ú':'u','ǔ':'u','ù':'u',
  'ǖ':'ü','ǘ':'ü','ǚ':'ü','ǜ':'ü',
}
const toneMarkDetect: Record<string, number> = {
  'ā':1,'ē':1,'ī':1,'ō':1,'ū':1,'ǖ':1,
  'á':2,'é':2,'í':2,'ó':2,'ú':2,'ǘ':2,
  'ǎ':3,'ě':3,'ǐ':3,'ǒ':3,'ǔ':3,'ǚ':3,
  'à':4,'è':4,'ì':4,'ò':4,'ù':4,'ǜ':4,
}
function stripTone(syl: string): string {
  return syl.split('').map(c => toneMarkMap[c] || c).join('')
}
function getSyllableTone(syl: string): number {
  for (const ch of syl) { if (toneMarkDetect[ch]) return toneMarkDetect[ch] }
  return 0
}

const POOL_SIZE = 50

function buildQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = []
  const tries = POOL_SIZE * 4
  const picked = getRandomAdvancedWords(tries)
  for (const w of picked) {
    if (out.length >= POOL_SIZE) break
    if (w.word.length !== 2) continue
    const syllables = w.pinyin.split(/\s+/).filter(Boolean)
    if (syllables.length !== 2) continue
    const t1 = getSyllableTone(syllables[0])
    const t2 = getSyllableTone(syllables[1])
    if (t1 === 0 || t2 === 0) continue
    out.push({
      word: w.word,
      syl1Base: stripTone(syllables[0]),
      syl2Base: stripTone(syllables[1]),
      tone1: t1,
      tone2: t2,
      pinyin: w.pinyin,
      english: '',
    })
  }
  return out
}

export default function QuizPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null)

  useEffect(() => {
    setQuestions(buildQuestions())
  }, [])

  function restart() {
    setQuestions(buildQuestions())
  }

  if (questions === null) {
    return (
      <main style={{paddingTop: '120px', textAlign: 'center'}}>
        <p style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#4d4447'}}>加载中...</p>
      </main>
    )
  }

  return (
    <QuizRunner
      questions={questions}
      title="HSK 测验"
      onExit={() => router.push('/')}
      onRestart={restart}
      audio
      source="HSK 测验"
    />
  )
}
