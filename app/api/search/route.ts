import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export type SearchItem = {
  id: string
  source: string
  title: string
  summary: string
  link: string
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/g, '')
}

function clean(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0 }
  return Math.abs(h).toString(36)
}

const HOST_LABEL: Record<string, string> = {
  'zaobao.com.sg': '联合早报',
  '163.com': '网易',
  '36kr.com': '36氪',
  'zhihu.com': '知乎',
  'sina.com.cn': '新浪',
  'sohu.com': '搜狐',
  'qq.com': '腾讯',
  'cctv.com': '央视',
  'thepaper.cn': '澎湃',
  'caixin.com': '财新',
  'huxiu.com': '虎嗅',
  'baike.baidu.com': '百度百科',
  'jiemian.com': '界面',
  'meishichina.com': '美食天下',
}

function labelFromHost(host: string): string {
  const h = host.replace(/^www\./, '')
  for (const [domain, label] of Object.entries(HOST_LABEL)) {
    if (h === domain || h.endsWith('.' + domain)) return label
  }
  return h
}

const BLOCKED_HOSTS = ['douyin.com', 'kuaishou.com', 'newsa.html5.qq.com', 'video.tudou.com', 'youku.com', 'iqiyi.com', 'xiaohongshu.com']

function isBlocked(host: string): boolean {
  const h = host.replace(/^www\./, '')
  return BLOCKED_HOSTS.some(b => h === b || h.endsWith('.' + b))
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ items: [], error: 'missing q' })

  try {
    const url = `https://www.bing.com/search?format=rss&q=${encodeURIComponent(q)}&setlang=zh-cn&cc=cn&count=20`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ items: [], error: 'upstream ' + res.status })
    const xml = await res.text()
    const items: SearchItem[] = []
    const seen = new Set<string>()
    for (const m of xml.matchAll(/<item>([\s\S]+?)<\/item>/g)) {
      const block = m[1]
      const t = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)
      const l = block.match(/<link>(.*?)<\/link>/)
      const d = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)
      const link = l ? clean(l[1]) : ''
      const title = t ? clean(t[1]) : ''
      const summary = d ? clean(d[1]) : ''
      if (!link || !title) continue
      try {
        const u = new URL(link)
        if (isBlocked(u.hostname)) continue
        if (!/[一-鿿]/.test(title)) continue
        if (seen.has(link)) continue
        seen.add(link)
        items.push({
          id: hash('search:' + link),
          source: labelFromHost(u.hostname),
          title,
          summary: summary || title,
          link,
        })
      } catch {}
      if (items.length >= 15) break
    }
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ items: [], error: String(e) })
  }
}
