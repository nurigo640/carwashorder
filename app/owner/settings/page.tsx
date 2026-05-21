'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Settings {
  name: string
  is_open: boolean
  active_posts: number
  avg_wash_time: number
  entry_timeout: number
  max_queue_size: number
  finish_mode: 'manual' | 'timer' | 'combined'
}

const FINISH_MODES = [
  { value: 'manual', label: 'Только вручную', desc: 'Оператор завершает мойку вручную. Таймер предупреждает, но не закрывает.' },
  { value: 'combined', label: 'Комбинированный', desc: 'Оператор может завершить вручную. Таймер страхует если не успел.' },
  { value: 'timer', label: 'Только по таймеру', desc: 'Позиция закрывается автоматически. Кнопка у оператора скрыта.' },
]

export default function OwnerSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [ownerName, setOwnerName] = useState('')
  const [washName, setWashName] = useState('')

  const fetchSettings = useCallback(async () => {
    const token = localStorage.getItem('owner_token')
    if (!token) { router.push('/owner'); return }
    setOwnerName(localStorage.getItem('owner_name') || '')
    setWashName(localStorage.getItem('wash_name') || '')
    try {
      const res = await fetch('/api/owner/settings', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) { localStorage.removeItem('owner_token'); router.push('/owner'); return }
      const json = await res.json()
      setSettings(json.data)
    } finally { setLoading(false) }
  }, [router])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    const token = localStorage.getItem('owner_token')
    try {
      const res = await fetch('/api/owner/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } finally { setSaving(false) }
  }

  const logout = () => {
    localStorage.removeItem('owner_token')
    localStorage.removeItem('owner_name')
    localStorage.removeItem('wash_name')
    localStorage.removeItem('wash_id')
    router.push('/owner')
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#f9f9ff'}}>
      <div style={{width:32,height:32,border:'3px solid #e5e7eb',borderTopColor:'#2563eb',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!settings) return null

  return (
    <div style={{fontFamily:'Inter,sans-serif',background:'#F3F4F6',minHeight:'100vh',maxWidth:390,margin:'0 auto'}}>

      {/* Header */}
      <div style={{background:'#fff',borderBottom:'1px solid #E5E7EB',padding:'12px 16px',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:12,color:'#6B7280'}}>Кабинет владельца</div>
            <div style={{fontSize:16,fontWeight:700,color:'#111827'}}>{washName}</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button onClick={() => router.push('/owner/qr')} style={{height:36,paddingLeft:14,paddingRight:14,background:'#EDE9FE',color:'#7C3AED',fontWeight:600,fontSize:13,borderRadius:8,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2zM17 17h2v2h-2zM19 19h2v2h-2zM15 19h2v2h-2zM13 19h2v2h-2z"/></svg>
              QR-код
            </button>
            <button onClick={logout} style={{height:36,width:36,background:'#F3F4F6',color:'#6B7280',borderRadius:8,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:12,paddingBottom:100}}>

        {/* Статус мойки */}
        <div style={{background:'#fff',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Статус мойки</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:15,fontWeight:600,color:'#111827'}}>{settings.is_open ? 'Мойка открыта' : 'Мойка закрыта'}</div>
              <div style={{fontSize:13,color:'#6B7280',marginTop:2}}>{settings.is_open ? 'Клиенты могут вставать в очередь' : 'Приём остановлен'}</div>
            </div>
            <div onClick={() => setSettings(s => s ? {...s, is_open: !s.is_open} : s)}
              style={{width:52,height:30,borderRadius:999,background:settings.is_open?'#16A34A':'#D1D5DB',cursor:'pointer',position:'relative',transition:'background .2s'}}>
              <div style={{position:'absolute',top:3,left:settings.is_open?24:3,width:24,height:24,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 4px rgba(0,0,0,0.2)',transition:'left .2s'}}/>
            </div>
          </div>
        </div>

        {/* Название мойки */}
        <div style={{background:'#fff',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Название мойки</div>
          <input
            value={settings.name}
            onChange={e => setSettings(s => s ? {...s, name: e.target.value} : s)}
            style={{width:'100%',height:44,borderRadius:10,border:'1px solid #E5E7EB',padding:'0 12px',fontSize:15,outline:'none',boxSizing:'border-box',color:'#111827'}}
          />
        </div>

        {/* Посты */}
        <div style={{background:'#fff',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Активных постов</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20}}>
            <button onClick={() => setSettings(s => s ? {...s, active_posts: Math.max(1, s.active_posts - 1)} : s)}
              style={{width:48,height:48,borderRadius:'50%',border:'1px solid #E5E7EB',background:'#F9FAFB',fontSize:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#374151'}}>−</button>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:36,fontWeight:700,color:'#111827',lineHeight:1}}>{settings.active_posts}</div>
              <div style={{fontSize:12,color:'#6B7280',marginTop:4}}>из 10 максимум</div>
            </div>
            <button onClick={() => setSettings(s => s ? {...s, active_posts: Math.min(10, s.active_posts + 1)} : s)}
              style={{width:48,height:48,borderRadius:'50%',border:'none',background:'#2563EB',fontSize:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>+</button>
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:12}}>
            {Array.from({length:10},(_,i) => (
              <div key={i} style={{width:20,height:20,borderRadius:'50%',background:i < settings.active_posts ? '#2563EB' : '#E5E7EB',transition:'background .2s'}}/>
            ))}
          </div>
        </div>

        {/* Таймер мойки */}
        <div style={{background:'#fff',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Среднее время мойки</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20}}>
            <button onClick={() => setSettings(s => s ? {...s, avg_wash_time: Math.max(5, s.avg_wash_time - 1)} : s)}
              style={{width:48,height:48,borderRadius:'50%',border:'1px solid #E5E7EB',background:'#F9FAFB',fontSize:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#374151'}}>−</button>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:36,fontWeight:700,color:'#111827',lineHeight:1}}>{settings.avg_wash_time}</div>
              <div style={{fontSize:12,color:'#6B7280',marginTop:4}}>минут</div>
            </div>
            <button onClick={() => setSettings(s => s ? {...s, avg_wash_time: Math.min(60, s.avg_wash_time + 1)} : s)}
              style={{width:48,height:48,borderRadius:'50%',border:'none',background:'#F59E0B',fontSize:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>+</button>
          </div>
          <div style={{background:'#FFFBEB',borderRadius:10,padding:'10px 14px',marginTop:12,display:'flex',gap:8,alignItems:'center'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
            <span style={{fontSize:12,color:'#92400E'}}>Влияет на расчёт времени ожидания в очереди</span>
          </div>
        </div>

        {/* Таймаут заезда */}
        <div style={{background:'#fff',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Таймаут на заезд</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20}}>
            <button onClick={() => setSettings(s => s ? {...s, entry_timeout: Math.max(1, s.entry_timeout - 1)} : s)}
              style={{width:48,height:48,borderRadius:'50%',border:'1px solid #E5E7EB',background:'#F9FAFB',fontSize:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#374151'}}>−</button>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:36,fontWeight:700,color:'#111827',lineHeight:1}}>{settings.entry_timeout}</div>
              <div style={{fontSize:12,color:'#6B7280',marginTop:4}}>минут на заезд</div>
            </div>
            <button onClick={() => setSettings(s => s ? {...s, entry_timeout: Math.min(10, s.entry_timeout + 1)} : s)}
              style={{width:48,height:48,borderRadius:'50%',border:'none',background:'#DC2626',fontSize:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>+</button>
          </div>
          <p style={{fontSize:12,color:'#6B7280',textAlign:'center',margin:'8px 0 0'}}>Время после уведомления до автоотмены</p>
        </div>

        {/* Макс. очередь */}
        <div style={{background:'#fff',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Максимальная длина очереди</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20}}>
            <button onClick={() => setSettings(s => s ? {...s, max_queue_size: Math.max(1, s.max_queue_size - 1)} : s)}
              style={{width:48,height:48,borderRadius:'50%',border:'1px solid #E5E7EB',background:'#F9FAFB',fontSize:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#374151'}}>−</button>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:36,fontWeight:700,color:'#111827',lineHeight:1}}>{settings.max_queue_size}</div>
              <div style={{fontSize:12,color:'#6B7280',marginTop:4}}>автомобилей</div>
            </div>
            <button onClick={() => setSettings(s => s ? {...s, max_queue_size: Math.min(50, s.max_queue_size + 1)} : s)}
              style={{width:48,height:48,borderRadius:'50%',border:'none',background:'#2563EB',fontSize:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>+</button>
          </div>
        </div>

        {/* Режим завершения */}
        <div style={{background:'#fff',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Режим завершения мойки</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {FINISH_MODES.map(mode => (
              <div key={mode.value} onClick={() => setSettings(s => s ? {...s, finish_mode: mode.value as any} : s)}
                style={{padding:'14px 16px',borderRadius:12,border:`1.5px solid ${settings.finish_mode === mode.value ? '#2563EB' : '#E5E7EB'}`,background:settings.finish_mode === mode.value ? '#F0F5FF' : '#fff',cursor:'pointer',display:'flex',gap:12,alignItems:'flex-start',transition:'all .15s'}}>
                <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${settings.finish_mode === mode.value ? '#2563EB' : '#D1D5DB'}`,background:settings.finish_mode === mode.value ? '#2563EB' : '#fff',flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {settings.finish_mode === mode.value && <div style={{width:8,height:8,borderRadius:'50%',background:'#fff'}}/>}
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:'#111827'}}>{mode.label}</div>
                  <div style={{fontSize:12,color:'#6B7280',marginTop:3,lineHeight:1.5}}>{mode.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Save button */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:390,padding:'12px 16px 34px',background:'rgba(243,244,246,0.95)',backdropFilter:'blur(8px)',borderTop:'1px solid #E5E7EB'}}>
        <button onClick={save} disabled={saving}
          style={{width:'100%',height:52,background:saved?'#16A34A':saving?'#93C5FD':'#2563EB',color:'#fff',fontWeight:700,fontSize:16,borderRadius:12,border:'none',cursor:saving?'not-allowed':'pointer',transition:'background .2s',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {saved ? (
            <><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>Сохранено!</>
          ) : saving ? 'Сохраняем...' : 'Сохранить настройки'}
        </button>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');`}</style>
    </div>
  )
}
