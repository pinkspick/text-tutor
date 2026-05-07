import { pinyin } from 'pinyin-pro'
import { getHskWord } from './hsk'

const isHan = (c: string) => /[一-鿿]/.test(c)

export type PinyinChar = { ch: string; py: string }

// Per-character pinyin with HSK 4-9 word-level overrides.
// pinyin-pro is decent but can mistag heteronyms. For any pair of consecutive
// CJK chars that match a curated HSK word, we use the HSK pinyin (which we
// trust). Otherwise we fall back to pinyin-pro's segmented output.
export function smartPinyin(text: string): PinyinChar[] {
  const fallback = pinyin(text, { type: 'array', toneType: 'symbol', nonZh: 'consecutive' }) as string[]
  const out: PinyinChar[] = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (!isHan(ch)) {
      out.push({ ch, py: '' })
      i++
      continue
    }
    if (i + 1 < text.length && isHan(text[i + 1])) {
      const word = text.slice(i, i + 2)
      const hsk = getHskWord(word)
      if (hsk?.pinyin) {
        const sylls = hsk.pinyin.split(/\s+/).filter(Boolean)
        if (sylls.length === 2) {
          out.push({ ch: text[i], py: sylls[0] })
          out.push({ ch: text[i + 1], py: sylls[1] })
          i += 2
          continue
        }
      }
    }
    out.push({ ch, py: fallback[i] || '' })
    i++
  }
  return out
}
