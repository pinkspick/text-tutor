import type { HskWord } from './hsk'

export type WrongAnswer = {
  word: string
  pinyin: string
  correctTones: [number, number]
  chosenTones: [number, number]
}

export type QuizRecord = {
  time: string
  source: string
  score: number
  correct: number
  total: number
  wrongs: WrongAnswer[]
}

export type DictationRecord = {
  time: string
  source: string
  title: string
  totalPhrases: number
  submittedCount: number
  avgScore: number
  perPhrase: { expected: string; actual: string; score: number }[]
}

export type DayEntry = {
  newWords: HskWord[]
  seenTexts: { title: string; source: string }[]
  quizzes: QuizRecord[]
  dictations: DictationRecord[]
}

export type LearnLog = {
  allTimeWords: string[]
  days: Record<string, DayEntry>
}

const KEY = 'learn_log'

function emptyLog(): LearnLog { return { allTimeWords: [], days: {} } }
function emptyDay(): DayEntry { return { newWords: [], seenTexts: [], quizzes: [], dictations: [] } }

function loadLog(): LearnLog {
  if (typeof window === 'undefined') return emptyLog()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyLog()
    const parsed = JSON.parse(raw) as Partial<LearnLog>
    const days: Record<string, DayEntry> = {}
    if (parsed.days && typeof parsed.days === 'object') {
      for (const [k, v] of Object.entries(parsed.days)) {
        const d = v as Partial<DayEntry>
        days[k] = {
          newWords: Array.isArray(d.newWords) ? d.newWords : [],
          seenTexts: Array.isArray(d.seenTexts) ? d.seenTexts : [],
          quizzes: Array.isArray(d.quizzes) ? d.quizzes : [],
          dictations: Array.isArray(d.dictations) ? d.dictations : [],
        }
      }
    }
    return {
      allTimeWords: Array.isArray(parsed.allTimeWords) ? parsed.allTimeWords : [],
      days,
    }
  } catch { return emptyLog() }
}

function saveLog(log: LearnLog) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(log))
}

export function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function recordTextView(text: { title: string; source: string }, hskWords: HskWord[]): { newCount: number } {
  const log = loadLog()
  const today = todayKey()
  if (!log.days[today]) log.days[today] = emptyDay()
  const day = log.days[today]
  if (!day.seenTexts.find(s => s.title === text.title && s.source === text.source)) {
    day.seenTexts.push({ title: text.title, source: text.source })
  }
  const seenSet = new Set(log.allTimeWords)
  const todayWordSet = new Set(day.newWords.map(w => w.word))
  let newCount = 0
  for (const w of hskWords) {
    if (seenSet.has(w.word)) continue
    seenSet.add(w.word)
    log.allTimeWords.push(w.word)
    if (!todayWordSet.has(w.word)) {
      day.newWords.push(w)
      todayWordSet.add(w.word)
      newCount++
    }
  }
  saveLog(log)
  return { newCount }
}

export function recordQuiz(record: Omit<QuizRecord, 'time'>) {
  const log = loadLog()
  const today = todayKey()
  if (!log.days[today]) log.days[today] = emptyDay()
  log.days[today].quizzes.push({ ...record, time: nowTime() })
  saveLog(log)
}

export function recordDictation(record: Omit<DictationRecord, 'time'>) {
  const log = loadLog()
  const today = todayKey()
  if (!log.days[today]) log.days[today] = emptyDay()
  log.days[today].dictations.push({ ...record, time: nowTime() })
  saveLog(log)
}

export function getAllDays(): { date: string; entry: DayEntry }[] {
  const log = loadLog()
  return Object.keys(log.days).sort((a, b) => b.localeCompare(a)).map(date => ({ date, entry: log.days[date] }))
}

export function clearLog() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}

export function buildMarkdown(): string {
  const days = getAllDays()
  if (days.length === 0) return '# 学习记录\n\n（无数据）\n'
  let md = `# 学习记录 · 文练\n\n_导出时间: ${new Date().toLocaleString('zh-CN')}_\n\n`
  for (const { date, entry } of days) {
    md += `\n## ${date}\n\n`
    if (entry.seenTexts.length) {
      md += `### 阅读 · ${entry.seenTexts.length} 篇\n\n`
      for (const s of entry.seenTexts) md += `- **${s.title}** _(${s.source})_\n`
      md += '\n'
    }
    if (entry.newWords.length) {
      md += `### 新生词 · ${entry.newWords.length} 个\n\n`
      for (const w of entry.newWords) {
        const lvl = w.level === 7 ? '7-9' : String(w.level)
        md += `- **${w.word}** \`${w.pinyin}\` — HSK ${lvl} — ${w.meaning}\n`
      }
      md += '\n'
    }
    if (entry.dictations.length) {
      md += `### 听写 · ${entry.dictations.length} 次\n\n`
      for (const d of entry.dictations) {
        md += `**${d.time} · ${d.title}** _(${d.source})_ — ${d.avgScore.toFixed(2)} / 100 (${d.submittedCount}/${d.totalPhrases} 句)\n\n`
        const wrongs = d.perPhrase.filter(p => p.score < 100)
        if (wrongs.length) {
          md += `错处:\n\n`
          for (const p of wrongs) {
            md += `- 期望: ${p.expected}\n  输入: ${p.actual} _(${p.score.toFixed(0)}/100)_\n`
          }
          md += '\n'
        }
      }
    }
    if (entry.quizzes.length) {
      md += `### 测验 · ${entry.quizzes.length} 次\n\n`
      for (const q of entry.quizzes) {
        md += `**${q.time} · ${q.source}** — ${q.score.toFixed(2)} / 100 (${q.correct}/${q.total} 正确)\n\n`
        if (q.wrongs.length) {
          md += `错题 (${q.wrongs.length}):\n\n`
          for (const w of q.wrongs) {
            const correctStr = w.correctTones.join('-')
            const chosenStr = w.chosenTones[0] === 0 ? '超时' : w.chosenTones.join('-')
            md += `- ${w.word} \`${w.pinyin}\` · 正确声调 ${correctStr} · 选择 ${chosenStr}\n`
          }
          md += '\n'
        }
      }
    }
  }
  return md
}
