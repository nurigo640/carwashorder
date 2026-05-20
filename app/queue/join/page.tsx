'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { } from '@/lib/queue'

export default function JoinQueuePage() {
  const router = useRouter()
  const [plate, setPlate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

const handleSubmit = async () => {
  if (plate.length < 4) {
    setError('Введите номер автомобиля')
    return
  }
  setError('')
  setLoading(true)
  try {
    const res = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plate_number: plate }),
    })
    const json = await res.json()
    if (!res.ok) {
      if (res.status === 409 && json.data?.session_token) {
        localStorage.setItem('queue_session_token', json.data.session_token)
        router.push(`/queue/my/${json.data.session_token}`)
        return
      }
      setError(json.error || 'Ошибка. Попробуйте ещё раз.')
      return
    }
    localStorage.setItem('queue_session_token', json.data.session_token)
    router.push(`/queue/my/${json.data.session_token}`)
  } catch {
    setError('Нет соединения. Попробуйте ещё раз.')
  } finally { setLoading(false) }
}
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate_number: normalized }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 409 && json.data?.session_token) {
          localStorage.setItem('queue_session_token', json.data.session_token)
          router.push(`/queue/my/${json.data.session_token}`)
          return
        }
        setError(json.error || 'Ошибка. Попробуйте ещё раз.')
        return
      }
      localStorage.setItem('queue_session_token', json.data.session_token)
      router.push(`/queue/my/${json.data.session_token}`)
    } catch {
      setError('Нет соединения. Попробуйте ещё раз.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{fontFamily:"'Inter',sans-serif",background:'#f9f9ff',color:'#141b2b',minHeight:'100vh',display:'flex',flexDirection:'column'}}>

      {/* Header */}
      <header style={{display:'flex',alignItems:'center',padding:'0 16px',height:56,background:'#f9f9ff',borderBottom:'1px solid #c3c6d7',position:'sticky',top:0,zIndex:50}}>
        <button onClick={() => router.back()} style={{width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',cursor:'pointer',color:'#111827',padding:0,flexShrink:0}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <span style={{flex:1,textAlign:'center',fontSize:17,fontWeight:600,color:'#111827'}}>Встать в очередь</span>
        <div style={{width:40}}/>
      </header>

      <main style={{flex:1,display:'flex',flexDirection:'column',padding:'24px 16px',gap:20}}>

        {/* Plate illustration */}
        <div style={{display:'flex',justifyContent:'center'}}>
          <div style={{position:'relative',background:'#fff',border:'2px solid #2563eb',borderRadius:8,width:192,height:48,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',boxShadow:'0 4px 6px -1px rgba(0,0,0,.1)'}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace",color:'#9CA3AF',letterSpacing:6,fontSize:16}}>_ _ _ _ _ _</span>
            <div style={{position:'absolute',right:0,top:0,width:12,background:'#003ea8',height:'100%',borderTopRightRadius:4,borderBottomRightRadius:4}}/>
          </div>
        </div>

        {/* Heading */}
        <div style={{textAlign:'center'}}>
          <h2 style={{fontSize:20,fontWeight:700,color:'#111827',margin:'0 0 8px'}}>Введите номер автомобиля</h2>
          <p style={{fontSize:13,color:'#6B7280',maxWidth:280,margin:'0 auto',lineHeight:1.5}}>
            Мы добавим вас в очередь и сообщим, когда придёт ваша очередь
          </p>
        </div>

        {/* Input */}
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <label style={{fontSize:13,color:'#6B7280',marginLeft:4}}>Гос. номер</label>
          <input
            type="text"
            value={plate}
           onChange={e => {
  const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  setPlate(val)
  setError('')
}}
            placeholder="000 AAA 00"
            maxLength={12}
            autoComplete="off"
            style={{
              width:'100%',height:56,borderRadius:12,
              border: error ? '2px solid #ba1a1a' : '2px solid #2563eb',
              textAlign:'center',
              fontFamily:"'JetBrains Mono',monospace",
              fontSize:24,fontWeight:700,letterSpacing:4,
              outline:'none',background:'#fff',
              boxSizing:'border-box',color:'#141b2b',
            }}
          />
          {error && <p style={{fontSize:13,color:'#ba1a1a',textAlign:'center',margin:0}}>{error}</p>}
        </div>

        {/* Warning */}
        <div style={{background:'#FFFBEB',borderLeft:'4px solid #F59E0B',borderRadius:12,padding:'12px 16px',display:'flex',gap:12,alignItems:'flex-start'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#F59E0B" style={{flexShrink:0,marginTop:2}}><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
          <p style={{fontSize:13,color:'#92400E',lineHeight:1.5,margin:0}}>
            Когда подойдёт ваша очередь, у вас будет <strong>2 минуты</strong> чтобы начать мойку — иначе место сбросится
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer style={{position:'sticky',bottom:0,background:'rgba(249,249,255,0.95)',backdropFilter:'blur(8px)',padding:'16px',paddingBottom:34,display:'flex',flexDirection:'column',gap:8,borderTop:'1px solid #e5e7eb'}}>
        <button
          onClick={handleSubmit}
          disabled={loading || plate.length < 6}
          style={{
            width:'100%',height:52,
            background: loading || plate.length < 6 ? '#93c5fd' : '#2563eb',
            color:'#fff',fontWeight:700,fontSize:16,
            borderRadius:12,border:'none',
            cursor: loading || plate.length < 6 ? 'not-allowed' : 'pointer',
            transition:'background .15s',
          }}>
          {loading ? 'Добавляем...' : 'Подтвердить и встать в очередь'}
        </button>
        <p style={{fontSize:12,color:'#6B7280',textAlign:'center',margin:0}}>
          Вы всегда можете отказаться от очереди
        </p>
      </footer>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@700&display=swap');`}</style>
    </div>
  )
}
