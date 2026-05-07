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

type CategoryDef = {
  key: string
  label: string
  zaobaoPaths: string[]
  includeBaidu: boolean
}

const CATEGORIES: CategoryDef[] = [
  { key: 'current',  label: '时事',   zaobaoPaths: ['news/china'],                includeBaidu: true },
  { key: 'world',    label: '国际',   zaobaoPaths: ['news/world'],                includeBaidu: false },
  { key: 'tech',     label: '科技',   zaobaoPaths: ['keywords/ke-ji'],            includeBaidu: false },
  { key: 'culture',  label: '文化',   zaobaoPaths: ['lifestyle/culture'],         includeBaidu: false },
  { key: 'history',  label: '历史',   zaobaoPaths: ['lifestyle/history-heritage'],includeBaidu: false },
  { key: 'food',     label: '美食',   zaobaoPaths: ['lifestyle/food'],            includeBaidu: false },
  { key: 'feature',  label: '特写',   zaobaoPaths: ['lifestyle/feature'],         includeBaidu: false },
]

export const KNOWN_CATEGORIES = CATEGORIES.map(c => ({ key: c.key, label: c.label }))

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

function unescapeJson(s: string): string {
  try { return JSON.parse('"' + s + '"') } catch { return s }
}

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0 }
  return Math.abs(h).toString(36)
}

async function fetchZaobaoList(path: string): Promise<NewsItem[]> {
  const url = `https://www.zaobao.com.sg/${path}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  })
  if (!res.ok) return []
  const html = await res.text()
  const items: NewsItem[] = []
  const seen = new Set<string>()
  // Cards have <a aria-label="..." href="/path/story...">
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
    if (items.length >= 12) break
  }
  return items
}

async function fetchBaidu(): Promise<NewsItem[]> {
  const res = await fetch('https://top.baidu.com/board?tab=realtime', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
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
      id: hash('baidu:' + title),
      source: '百度热搜',
      title,
      summary: desc,
      image,
      link: 'https://www.baidu.com/s?wd=' + encodeURIComponent(title),
    })
    if (items.length >= 10) break
  }
  return items
}

export async function GET(req: NextRequest) {
  const cat = req.nextUrl.searchParams.get('cat') || 'current'
  const def = CATEGORIES.find(c => c.key === cat) || CATEGORIES[0]

  const tasks: Promise<NewsItem[]>[] = def.zaobaoPaths.map(p => fetchZaobaoList(p))
  if (def.includeBaidu) tasks.push(fetchBaidu())

  const settled = await Promise.allSettled(tasks)
  const items: NewsItem[] = []
  for (const r of settled) {
    if (r.status === 'fulfilled') items.push(...r.value)
  }
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]]
  }
  return NextResponse.json({ items, category: def.key, categories: KNOWN_CATEGORIES, fetchedAt: new Date().toISOString() })
}
