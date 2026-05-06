
export function getToneColor(syllable: string): string {
  const toneMarks: Record<string, number> = {
    'ā':1,'ē':1,'ī':1,'ō':1,'ū':1,'ǖ':1,
    'á':2,'é':2,'í':2,'ó':2,'ú':2,'ǘ':2,
    'ǎ':3,'ě':3,'ǐ':3,'ǒ':3,'ǔ':3,'ǚ':3,
    'à':4,'è':4,'ì':4,'ò':4,'ù':4,'ǜ':4,
  }
  const toneColors: Record<number, string> = {
    1: '#e53935',
    2: '#fb8c00',
    3: '#2e7d32',
    4: '#1e88e5',
  }
  for (const char of syllable) {
    const tone = toneMarks[char]
    if (tone) return toneColors[tone]
  }
  return '#c07a8a'
}

export function colorPinyinLine(pinyinLine: string): Array<{text: string, color: string}> {
  const syllables = pinyinLine.split(' ')
  return syllables.map(s => ({ text: s, color: getToneColor(s) }))
}
