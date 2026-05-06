import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/g, '')
}

function strip(html: string): string {
  return decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ text: '', error: 'missing url' }, { status: 400 })

  let parsed: URL
  try { parsed = new URL(url) } catch { return NextResponse.json({ text: '', error: 'bad url' }, { status: 400 }) }
  // Whitelist: only fetch known content hosts
  const allowed = ['voachinese.com', 'www.voachinese.com']
  if (!allowed.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
    return NextResponse.json({ text: '', error: 'host not allowed' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'zh-CN,zh;q=0.9' },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ text: '', error: 'fetch failed' })
    const html = await res.text()

    // Pull <p> paragraphs from VOA's article body. They use <p > (with trailing space) in the body.
    const paragraphs: string[] = []
    for (const m of html.matchAll(/<p[\s>][\s\S]*?<\/p>/g)) {
      const text = strip(m[0])
      if (text.length >= 25 && /[一-鿿]/.test(text)) {
        paragraphs.push(text)
      }
    }
    const text = paragraphs.join('\n\n')
    return NextResponse.json({ text, paragraphCount: paragraphs.length })
  } catch (e) {
    return NextResponse.json({ text: '', error: String(e) })
  }
}
