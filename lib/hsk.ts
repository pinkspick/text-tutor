import raw from './hskWords.json'

type HskLevel = '4' | '5' | '6' | '7'
type Entry = [string, string, string]

const data = raw as Record<HskLevel, Entry[]>

export type HskWord = { word: string; pinyin: string; meaning: string; level: number }

const wordIndex = new Map<string, HskWord>()
for (const lvl of ['4', '5', '6', '7'] as HskLevel[]) {
  const num = lvl === '7' ? 7 : Number(lvl)
  for (const [word, pinyin, meaning] of data[lvl]) {
    if (!wordIndex.has(word)) {
      wordIndex.set(word, { word, pinyin, meaning, level: num })
    }
  }
}

export function getHskLevel(word: string): number | null {
  return wordIndex.get(word)?.level ?? null
}

export function getHskWord(word: string): HskWord | null {
  return wordIndex.get(word) ?? null
}

export function isAdvancedHsk(word: string): boolean {
  const lvl = wordIndex.get(word)?.level
  return lvl !== undefined && lvl >= 4
}

export function getRandomAdvancedWords(count: number): HskWord[] {
  const pool: HskWord[] = []
  for (const lvl of ['4', '5', '6', '7'] as HskLevel[]) {
    for (const entry of data[lvl]) {
      const word = entry[0]
      const w = wordIndex.get(word)
      if (w) pool.push(w)
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}
