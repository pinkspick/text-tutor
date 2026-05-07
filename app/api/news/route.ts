import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export type NewsItem = {
  id: string
  source: string
  title: string
  summary: string
  link?: string
  image?: string
  publishedAt?: string
}

type Source =
  | { kind: 'zaobao'; path: string }
  | { kind: 'baidu'; tab: string; source: string }
  | { kind: '36kr' }
  | { kind: '163' }

type CategoryDef = {
  key: string
  label: string
  sources: Source[]
}

const CATEGORIES: CategoryDef[] = [
  { key: 'current',  label: '时事',  sources: [
    { kind: 'zaobao', path: 'news/china' },
    { kind: 'baidu',  tab: 'realtime', source: '百度热搜' },
  ]},
  { key: 'world',    label: '国际',  sources: [
    { kind: 'zaobao', path: 'news/world' },
  ]},
  { key: 'tech',     label: '科技',  sources: [
    { kind: 'zaobao', path: 'keywords/ke-ji' },
    { kind: '36kr' },
  ]},
  { key: 'culture',  label: '文化',  sources: [
    { kind: 'zaobao', path: 'lifestyle/culture' },
  ]},
  { key: 'history',  label: '历史',  sources: [
    { kind: 'zaobao', path: 'lifestyle/history-heritage' },
  ]},
  { key: 'food',     label: '美食',  sources: [
    { kind: 'zaobao', path: 'lifestyle/food' },
  ]},
  { key: 'entertainment', label: '影视', sources: [
    { kind: 'baidu', tab: 'movie',    source: '百度电影' },
    { kind: 'baidu', tab: 'teleplay', source: '百度电视剧' },
  ]},
  { key: 'feature',  label: '趣闻',  sources: [
    { kind: 'zaobao', path: 'lifestyle/feature' },
    { kind: '163' },
    { kind: 'baidu', tab: 'novel', source: '百度小说' },
  ]},
]

export const KNOWN_CATEGORIES = CATEGORIES.map(c => ({ key: c.key, label: c.label }))

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/g, '')
}

function unescapeJson(s: string): string {
  try { return JSON.parse('"' + s + '"') } catch { return s }
}

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0 }
  return Math.abs(h).toString(36)
}

const UA_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

async function fetchZaobaoList(path: string): Promise<NewsItem[]> {
  const url = `https://www.zaobao.com.sg/${path}`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA_MAC },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  })
  if (!res.ok) return []
  const html = await res.text()
  const items: NewsItem[] = []
  const seen = new Set<string>()
  for (const m of html.matchAll(/aria-label="([^"]{6,200})"[^>]*href="(\/[^"]*story[^"]*)"/g)) {
    const title = decodeEntities(m[1]).trim()
    const slug = m[2]
    if (seen.has(slug)) continue
    if (!/[一-鿿]/.test(title)) continue
    seen.add(slug)
    items.push({
      id: hash('zb:' + slug),
      source: '联合早报',
      title,
      summary: title,
      link: 'https://www.zaobao.com.sg' + slug,
    })
    if (items.length >= 10) break
  }
  return items
}

async function fetchBaiduTab(tab: string, label: string): Promise<NewsItem[]> {
  const res = await fetch(`https://top.baidu.com/board?tab=${tab}`, {
    headers: { 'User-Agent': UA_MAC, 'Accept-Language': 'zh-CN,zh;q=0.9' },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  if (!res.ok) return []
  const html = await res.text()
  const items: NewsItem[] = []
  const seen = new Set<string>()
  for (const m of html.matchAll(/"desc":"((?:[^"\\]|\\.)*)"[\s\S]{0,800}?"query":"((?:[^"\\]|\\.)*)"/g)) {
    const desc = unescapeJson(m[1] || '')
    const title = unescapeJson(m[2] || '')
    if (!title || !desc || seen.has(title)) continue
    const window = m[0]
    const imgMatch = window.match(/"img":"((?:[^"\\]|\\.)*)"/)
    const image = imgMatch ? unescapeJson(imgMatch[1]) : undefined
    seen.add(title)
    items.push({
      id: hash(`baidu:${tab}:` + title),
      source: label,
      title,
      summary: desc,
      image,
      link: 'https://www.baidu.com/s?wd=' + encodeURIComponent(title),
    })
    if (items.length >= 10) break
  }
  return items
}

async function fetch36kr(): Promise<NewsItem[]> {
  const res = await fetch('https://www.36kr.com/information/web_news/latest', {
    headers: { 'User-Agent': UA_MAC },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  })
  if (!res.ok) return []
  const html = await res.text()
  const items: NewsItem[] = []
  const seen = new Set<string>()
  for (const m of html.matchAll(/"itemId":(\d+)[\s\S]{0,200}?"templateMaterial":\{([\s\S]{50,3000}?)\}/g)) {
    const itemId = m[1]
    const block = m[2]
    const titleMatch = block.match(/"widgetTitle":"((?:[^"\\]|\\.)+)"/)
    const summaryMatch = block.match(/"summary":"((?:[^"\\]|\\.)+)"/)
    if (!titleMatch || !summaryMatch) continue
    const title = unescapeJson(titleMatch[1])
    const summary = unescapeJson(summaryMatch[1])
    if (!/[一-鿿]/.test(title) || seen.has(itemId)) continue
    seen.add(itemId)
    const imageMatch = block.match(/"widgetImage":"((?:[^"\\]|\\.)+)"/)
    const image = imageMatch ? unescapeJson(imageMatch[1]) : undefined
    items.push({
      id: hash('36kr:' + itemId),
      source: '36氪',
      title,
      summary,
      image,
      link: `https://www.36kr.com/p/${itemId}`,
    })
    if (items.length >= 10) break
  }
  return items
}

async function fetch163(): Promise<NewsItem[]> {
  const res = await fetch('https://news.163.com/', {
    headers: { 'User-Agent': UA_MAC },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  })
  if (!res.ok) return []
  const html = await res.text()
  const items: NewsItem[] = []
  const seen = new Set<string>()
  for (const m of html.matchAll(/<a [^>]*href="(https?:\/\/www\.163\.com\/[^"]*\/article\/[A-Z0-9]+\.html)"[^>]*>([^<]{10,80})</g)) {
    const url = m[1]
    const title = decodeEntities(m[2]).trim()
    if (!/[一-鿿]/.test(title) || seen.has(url)) continue
    seen.add(url)
    items.push({
      id: hash('163:' + url),
      source: '网易新闻',
      title,
      summary: title,
      link: url,
    })
    if (items.length >= 10) break
  }
  return items
}

async function fetchSource(s: Source): Promise<NewsItem[]> {
  switch (s.kind) {
    case 'zaobao': return fetchZaobaoList(s.path)
    case 'baidu':  return fetchBaiduTab(s.tab, s.source)
    case '36kr':   return fetch36kr()
    case '163':    return fetch163()
  }
}

export async function GET(req: NextRequest) {
  const cat = req.nextUrl.searchParams.get('cat') || 'current'
  const def = CATEGORIES.find(c => c.key === cat) || CATEGORIES[0]

  const settled = await Promise.allSettled(def.sources.map(fetchSource))
  const items: NewsItem[] = []
  for (const r of settled) if (r.status === 'fulfilled') items.push(...r.value)

  // Shuffle so multiple sources interleave
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]]
  }
  return NextResponse.json({
    items, category: def.key, categories: KNOWN_CATEGORIES,
    fetchedAt: new Date().toISOString()
  })
}
