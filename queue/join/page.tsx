'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { validatePlate, normalizePlate } from '@/lib/queue'

const IconBack = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
const IconWarning = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="#F59E0B"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>

export default function JoinQueuePage() {
  const router = useRouter()
  const [plate, setPlate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const normalized = normalizePlate(plate)
    if (!validatePlate(normalized)) {
      setError('Неверный формат. Пример: А123ВС777')
      return
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
      const token = json.data.session_token
      localStorage.setItem('queue_session_token', token)
      router.push(`/queue/my/${token}`)
    } catch {
      setError('Нет соединения. Попробуйте ещё раз.')
    } finally { setLoading(false) }
  }

  const S: Record<string, React.CSSProperties> = {
    wrap: {fontFamily:'Inter,sans-serif',background:'#f9f9ff',color:'#141b2b',minHeight:'100vh',display:'flex',flexDirection:'column'},
    header: {display:'flex',alignItems:'center',padding:'0 16px',height:56,background:'#f9f9ff',borderBottom:'1px solid #c3c6d7',position:'sticky',top:0,zIndex:50},
    backBtn: {width:40,height:40,display:'flex',alignItems:'center',background:'none',border:'none',cursor:'pointer',color:'#111827',padding:0},
    title: {flex:1,textAlign:'center',fontSize:17,fontWeight:600,color:'#111827'},
    main: {flex:1,display:'flex',flexDirection:'column',padding:'24px 16px',gap:16},
    plateViz: {display:'flex',justifyContent:'center',marginBottom:8},
    plateBox: {position:'relative',background:'#fff',border:'2px solid #2563eb',borderRadius:8,width:192,height:48,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',boxShadow:'0 4px 6px -1px rgba(0,0,0,.1)'},
    platePlaceholder: {fontFamily:'JetBrains Mono,monospace',color:'#9CA3AF',letterSpacing:6,fontSize:16},
    plateStrip: {position:'absolute',right:0,top:0,width:12,background:'#003ea8',height:'100%',borderTopRightRadius:4,borderBottomRightRadius:4},
    headingBlock: {textAlign:'center'},
    h2: {fontSize:20,fontWeight:700,color:'#111827',margin:'0 0 8px'},
    sub: {fontSize:13,color:'#6B7280',maxWidth:280,margin:'0 auto'},
    label: {fontSize:13,color:'#6B7280',marginBottom:4,display:'block',marginLeft:4},
    input: {width:'100%',height:56,borderRadius:12,border:'2px solid #2563eb',textAlign:'center',fontFamily:'JetBrains Mono,monospace',fontSize:24,fontWeight:700,letterSpacing:4,outline:'none',background:'#fff',boxSizing:'border-box',color:'#141b2b'},
    inputError: {border:'2px solid #ba1a1a'},
    errorText: {fontSize:13,color:'#ba1a1a',textAlign:'center',marginTop:4},
    warning: {background:'#FFFBEB',borderLeft:'4px solid #F59E0B',borderRadius:12,padding:'12px 16px',display:'flex',gap:12,alignItems:'flex-start'},
    warningText: {fontSize:13,color:'#92400E',lineHeight:1.5,margin:0},
    footer: {position:'sticky',bottom:0,background:'rgba(249,249,255,0.9)',backdropFilter:'blur(8px)',padding:'16px',paddingBottom:34,display:'flex',flexDirection:'column',gap:8},
    btn: {width:'100%',height:52,background:'#2563eb',color:'#fff',fontWeight:700,fontSize:16,borderRadius:12,border:'none',cursor:'pointer',transition:'opacity .15s'},
    btnDisabled: {opacity:.4,cursor:'not-allowed'},
    hint: {fontSize:12,color:'#6B7280',textAlign:'center',margin:0},
  }

  return (
    <div style={S.wrap}>
      <header style={S.header}>
        <button style={S.backBtn} onClick={() => router.back()}><IconBack/></button>
        <span style={S.title}>Встать в очередь</span>
        <div style={{width:40}}/>
      </header>

      <main style={S.main}>
        <div style={S.plateViz}>
          <div style={S.plateBox}>
            <span style={S.platePlaceholder}>_ _ _ _ _ _</span>
            <div style={S.plateStrip}/>
          </div>
        </div>

        <div style={S.headingBlock}>
          <h2 style={S.h2}>Введите номер автомобиля</h2>
          <p style={S.sub}>Мы добавим вас в очередь и сообщим, когда придёт ваша очередь</p>
        </div>

        <div>
          <label style={S.label}>Гос. номер</label>
          <input
            type="text"
            value={plate}
            onChange={e => { setPlate(e.target.value.toUpperCase()); setError('') }}
            placeholder="А 000 АА 000"
            maxLength={12}
            autoComplete="off"
            autoCorrect="off"
            style={{...S.input, ...(error ? S.inputError : {})}}
          />
          {error && <p style={S.errorText}>{error}</p>}
        </div>

        <div style={S.warning}>
          <IconWarning/>
          <p style={S.warningText}>
            Когда подойдёт ваша очередь, у вас будет <strong>2 минуты</strong> чтобы начать мойку — иначе место сбросится
          </p>
        </div>
      </main>

      <footer style={S.footer}>
        <button
          onClick={handleSubmit}
          disabled={loading || plate.length < 6}
          style={{...S.btn, ...(loading || plate.length < 6 ? S.btnDisabled : {})}}>
          {loading ? 'Добавляем...' : 'Подтвердить и встать в очередь'}
        </button>
        <p style={S.hint}>Вы всегда можете отказаться от очереди</p>
      </footer>
    </div>
  )
}
