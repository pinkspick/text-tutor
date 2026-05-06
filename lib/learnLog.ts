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

export type DayEntry = {
  newWords: HskWord[]
  seenSongs: { title: string; artist: string }[]
  quizzes: QuizRecord[]
}

export type LearnLog = {
  allTimeWords: string[]
  days: Record<string, DayEntry>
}

const KEY = 'learn_log'

function emptyLog(): LearnLog {
  return { allTimeWords: [], days: {} }
}

function emptyDay(): DayEntry {
  return { newWords: [], seenSongs: [], quizzes: [] }
}

function loadLog(): LearnLog {
  if (typeof window === 'undefined') return emptyLog()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyLog()
    const parsed = JSON.parse(raw) as Partial<LearnLog>
    return {
      allTimeWords: Array.isArray(parsed.allTimeWords) ? parsed.allTimeWords : [],
      days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
    }
  } catch {
    return emptyLog()
  }
}

function saveLog(log: LearnLog) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(log))
}

export function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function recordSongView(song: { title: string; artist: string }, hskWords: HskWord[]): { newCount: number } {
  const log = loadLog()
  const today = todayKey()
  if (!log.days[today]) log.days[today] = emptyDay()
  const day = log.days[today]
  if (!day.seenSongs.find(s => s.title === song.title && s.artist === song.artist)) {
    day.seenSongs.push({ title: song.title, artist: song.artist })
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

export function getAllDays(): { date: string; entry: DayEntry }[] {
  const log = loadLog()
  return Object.keys(log.days)
    .sort((a, b) => b.localeCompare(a))
    .map(date => ({ date, entry: log.days[date] }))
}

export function clearLog() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}

export function buildMarkdown(): string {
  const days = getAllDays()
  if (days.length === 0) return '# 学习记录\n\n（无数据）\n'
  let md = `# 学习记录\n\n_导出时间: ${new Date().toLocaleString('zh-CN')}_\n\n`
  for (const { date, entry } of days) {
    md += `\n## ${date}\n\n`
    if (entry.newWords.length) {
      md += `### 新生词 · ${entry.newWords.length} 个\n\n`
      for (const w of entry.newWords) {
        const lvl = w.level === 7 ? '7-9' : String(w.level)
        md += `- **${w.word}** \`${w.pinyin}\` — HSK ${lvl} — ${w.meaning}\n`
      }
      md += '\n'
    }
    if (entry.seenSongs.length) {
      md += `### 听过的歌曲\n\n`
      for (const s of entry.seenSongs) md += `- ${s.title} — ${s.artist}\n`
      md += '\n'
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
