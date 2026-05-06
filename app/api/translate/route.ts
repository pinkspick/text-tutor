import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Uses the unofficial Google Translate endpoint (the one Chrome extensions use).
// No key, but rate-limited per IP. Returns nested arrays where result[0][i][0] is translated segment.
export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get('q')
  const target = req.nextUrl.searchParams.get('to') || 'en'
  const source = req.nextUrl.searchParams.get('from') || 'zh-CN'
  if (!text) return NextResponse.json({ translated: '', error: 'missing q' }, { status: 400 })
  if (text.length > 5000) return NextResponse.json({ translated: '', error: 'too long' }, { status: 400 })

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ translated: '', error: 'upstream ' + res.status })
    const data = await res.json() as unknown
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      return NextResponse.json({ translated: '', error: 'unexpected shape' })
    }
    const segments = (data[0] as unknown[])
      .filter((s): s is unknown[] => Array.isArray(s))
      .map(s => typeof s[0] === 'string' ? s[0] : '')
      .join('')
    return NextResponse.json({ translated: segments })
  } catch (e) {
    return NextResponse.json({ translated: '', error: String(e) })
  }
}
