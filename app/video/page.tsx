'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

function cleanTranscript(raw: string): string {
  // Strip lines that are purely timestamps like "0:00", "12:34", "1:02:03"
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  return lines
    .filter(l => !/^(?:\d{1,2}:)?\d{1,2}:\d{2}$/.test(l))
    .filter(l => !/^\[(?:Music|音乐|Applause|掌声)\]$/i.test(l))
    .join('\n')
}

export default function VideoPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [transcript, setTranscript] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const cleaned = cleanTranscript(transcript)
  const charCount = (cleaned.match(/[一-鿿]/g) || []).length
  const ready = charCount >= 30

  function submit() {
    if (!ready) return
    const finalTitle = title.trim() || 'YouTube 视频'
    localStorage.setItem('current_text', JSON.stringify({
      text: cleaned,
      source: 'YouTube',
      title: finalTitle,
      pickedAt: new Date().toISOString(),
    }))
    router.push('/analyze')
  }

  return (
    <main style={{paddingBottom: '120px', maxWidth: '700px', margin: '0 auto'}}>
      <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#fff8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px'}}>
        <button onClick={() => router.push('/')} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
          <span className="material-symbols-outlined" style={{color: '#bc004b'}}>arrow_back</span>
        </button>
        <h1 style={{fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '20px', color: '#bc004b', margin: 0}}>YouTube 字幕</h1>
        <span style={{width: 30}} />
      </header>

      <section style={{padding: '96px 24px 16px'}}>
        <h2 style={{fontFamily: 'Newsreader, serif', fontSize: '28px', fontWeight: 700, lineHeight: 1.2, marginBottom: '4px'}}>从视频学中文</h2>
        <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '12px', color: '#7f7478', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0, marginBottom: '16px'}}>粘贴字幕 · 自动出生词、听写、复习</p>

        <button
          onClick={() => setShowHelp(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', color: '#bc004b',
            cursor: 'pointer', padding: '6px 0',
            fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          <span className="material-symbols-outlined" style={{fontSize: 18}}>{showHelp ? 'expand_less' : 'help_outline'}</span>
          如何获取字幕？
        </button>
        {showHelp && (
          <div style={{
            backgroundColor: '#fff0f4', borderRadius: '12px', padding: '14px 16px',
            marginBottom: '16px',
            fontFamily: 'Newsreader, serif', fontSize: '14px', lineHeight: 1.7, color: '#25181e'
          }}>
            <p style={{margin: '0 0 10px', fontWeight: 700}}>📱 YouTube App 上：</p>
            <ol style={{margin: '0 0 12px', paddingLeft: '22px'}}>
              <li>打开视频 → 点击描述展开</li>
              <li>下拉，找到 <strong>显示文字记录</strong></li>
              <li>长按文字 → 全选 → 复制</li>
            </ol>
            <p style={{margin: '0 0 10px', fontWeight: 700}}>💻 桌面网页上：</p>
            <ol style={{margin: '0 0 12px', paddingLeft: '22px'}}>
              <li>视频下方点 <strong>更多</strong></li>
              <li>点 <strong>显示文字记录</strong>（右侧打开）</li>
              <li>选中所有内容 → Cmd/Ctrl+C</li>
            </ol>
            <p style={{margin: 0, color: '#7f7478', fontSize: '12px', fontStyle: 'italic'}}>
              中文字幕需要先在齿轮 ⚙️ 里把字幕语言切换成「中文」。带时间戳也没关系，会自动去掉。
            </p>
          </div>
        )}

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="视频标题（可选）"
          style={{
            width: '100%', padding: '12px 14px', borderRadius: '10px',
            border: '1.5px solid #f0d8d8', backgroundColor: '#fff',
            fontFamily: 'Newsreader, serif', fontSize: '16px',
            outline: 'none', boxSizing: 'border-box', marginBottom: '10px'
          }}
        />

        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder="在这里粘贴字幕..."
          style={{
            width: '100%', minHeight: '260px', resize: 'vertical',
            padding: '14px', borderRadius: '12px',
            border: '2px solid #f0d8d8', backgroundColor: '#fff',
            fontFamily: 'Newsreader, serif', fontSize: '17px', lineHeight: 1.6,
            outline: 'none', boxSizing: 'border-box'
          }}
        />

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', marginBottom: '12px'}}>
          <span style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', color: '#7f7478'}}>
            {charCount} 个汉字{charCount > 0 && charCount < 30 ? ' · 至少需要 30 个' : ''}
          </span>
          <button
            onClick={submit}
            disabled={!ready}
            style={{
              backgroundColor: ready ? '#bc004b' : '#d0c3c7', color: '#fff',
              border: 'none', borderRadius: '10px', padding: '12px 24px',
              cursor: ready ? 'pointer' : 'default',
              fontFamily: 'Work Sans, sans-serif', fontSize: '13px', fontWeight: 600
            }}>开始 →</button>
        </div>

        {transcript.length > 0 && cleaned.length !== transcript.length && (
          <p style={{fontFamily: 'Work Sans, sans-serif', fontSize: '11px', color: '#7f7478', fontStyle: 'italic', margin: 0}}>
            ✓ 已自动去掉时间戳和音乐标记
          </p>
        )}
      </section>
    </main>
  )
}
