import { NextRequest, NextResponse } from 'next/server'

// Uses MDBG CC-CEDICT API (free, no key needed)
export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get('w')
  if (!word) return NextResponse.json({ definition: '', pinyin: '' })

  try {
    const res = await fetch(
      'https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqb=' + encodeURIComponent(word),
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const html = await res.text()

    const defMatch = html.match(/class="defs"[^>]*>([^<]+)</)
    const pinyinMatch = html.match(/class="pinyin" title="Mandarin[^"]*">([\s\S]*?)<\/div>/)
    const definition = defMatch ? defMatch[1].trim() : ''
    let pinyin = ''
    if (pinyinMatch) {
      pinyin = pinyinMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/​/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }
    return NextResponse.json({ definition, pinyin })
  } catch {
    return NextResponse.json({ definition: '', pinyin: '' })
  }
}
