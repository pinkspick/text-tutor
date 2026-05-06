import { NextResponse } from 'next/server'

export const revalidate = 300

export type NewsItem = {
  id: string
  source: string
  title: string
  summary: string
  link?: string
  publishedAt?: string
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/g, '')
}

function clean(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}

function unescapeJson(s: string): string {
  try { return JSON.parse('"' + s + '"') } catch { return s }
}

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0 }
  return Math.abs(h).toString(36)
}

function parseRSS(xml: string): { title: string; description: string; link?: string; pubDate?: string }[] {
  const items: { title: string; description: string; link?: string; pubDate?: string }[] = []
  for (const m of xml.matchAll(/<item\b[\s\S]*?<\/item>/g)) {
    const block = m[0]
    const t = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)
    const d = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)
    const l = block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/)
    const p = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)
    const title = t ? clean(t[1]) : ''
    const description = d ? clean(d[1]) : ''
    if (title && description) {
      items.push({
        title,
        description,
        link: l ? clean(l[1]) : undefined,
        pubDate: p ? clean(p[1]) : undefined,
      })
    }
  }
  return items
}

async function fetchVOA(): Promise<NewsItem[]> {
  const res = await fetch('https://www.voachinese.com/api/?type=rss&zoneId=0', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return []
  const xml = await res.text()
  const items = parseRSS(xml)
  return items
    .filter(it => !/广播|焦点.*音频|VOA.*音频/i.test(it.title))
    .slice(0, 12)
    .map(it => ({
      id: hash('voa:' + it.title),
      source: 'VOA 中文',
      title: it.title,
      summary: it.description,
      link: it.link,
      publishedAt: it.pubDate,
    }))
}

async function fetchBaidu(): Promise<NewsItem[]> {
  const res = await fetch('https://top.baidu.com/board?tab=realtime', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return []
  const html = await res.text()
  const items: NewsItem[] = []
  const seen = new Set<string>()
  for (const m of html.matchAll(/"query":"((?:[^"\\]|\\.)*)"[\s\S]{0,400}?"desc":"((?:[^"\\]|\\.)*)"|"desc":"((?:[^"\\]|\\.)*)"[\s\S]{0,400}?"query":"((?:[^"\\]|\\.)*)"/g)) {
    const title = unescapeJson(m[1] || m[4] || '')
    const desc = unescapeJson(m[2] || m[3] || '')
    if (!title || !desc || seen.has(title)) continue
    seen.add(title)
    items.push({
      id: hash('baidu:' + title),
      source: '百度热搜',
      title,
      summary: desc,
      link: 'https://www.baidu.com/s?wd=' + encodeURIComponent(title),
    })
    if (items.length >= 12) break
  }
  return items
}

export async function GET() {
  const results = await Promise.allSettled([fetchVOA(), fetchBaidu()])
  const items: NewsItem[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') items.push(...r.value)
  }
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]]
  }
  return NextResponse.json({ items, fetchedAt: new Date().toISOString() })
}
