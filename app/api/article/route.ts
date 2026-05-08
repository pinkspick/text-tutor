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
  const allowed = [
    'zaobao.com.sg',
    '163.com',
    '36kr.com',
    'zhihu.com',
    'sina.com.cn',
    'sohu.com',
    'qq.com',
    'cctv.com',
    'thepaper.cn',
    'caixin.com',
    'huxiu.com',
    'jiemian.com',
    'meishichina.com',
    'baike.baidu.com',
    'xinhuanet.com',
    'people.com.cn',
    'chinanews.com',
    'chinanews.com.cn',
    'ifeng.com',
    'guancha.cn',
    'guokr.com',
    'allhistory.com',
    'qulishi.com',
    'lishi.net',
  ]
  const matchAllow = (host: string) => allowed.some(h => host === h || host.endsWith('.' + h))
  if (!matchAllow(parsed.hostname)) {
    return NextResponse.json({ text: '', error: 'host not allowed' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept-Language': 'zh-CN,zh;q=0.9' },
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ text: '', error: 'fetch failed' })
    const html = await res.text()

    const ogDesc = html.match(/<meta property="og:description" content="([^"]*)"/)?.[1] || ''
    const ogImg = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] || ''

    const paragraphs: string[] = []
    for (const m of html.matchAll(/<p[\s>][\s\S]*?<\/p>/g)) {
      const text = strip(m[0])
      if (text.length >= 20 && /[一-鿿]/.test(text)) {
        paragraphs.push(text)
      }
    }
    const text = paragraphs.join('\n\n')
    return NextResponse.json({ text, paragraphCount: paragraphs.length, ogDescription: decode(ogDesc), ogImage: ogImg })
  } catch (e) {
    return NextResponse.json({ text: '', error: String(e) })
  }
}
