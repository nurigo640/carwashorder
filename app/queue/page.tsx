'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatWaitTime, calcWaitMinutes } from '@/lib/queue'
import type { QueueEntry, WashSettings } from '@/types'

export default function QueuePage() {
  const router = useRouter()
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [settings, setSettings] = useState<WashSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setEntries(json.entries || [])
      setSettings(json.settings)
      setIsOnline(true)
    } catch { setIsOnline(false) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('queue_session_token')
    if (token) { router.push(`/queue/my/${token}`); return }
    fetchQueue()
  }, [fetchQueue, router])

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel('queue_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, fetchQueue)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchQueue])

  const active = entries.filter(e =>
    ['waiting','notified','entering','washing'].includes(e.status)
  )

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#f9f9ff'}}>
      <div style={{width:32,height:32,border:'3px solid #e5e7eb',borderTopColor:'#2563eb',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{fontFamily:"'Inter',sans-serif",background:'#f9f9ff',color:'#141b2b',minHeight:'100vh',display:'flex',flexDirection:'column',maxWidth:390,margin:'0 auto'}}>
      <div style={{height:44,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',background:'#f9f9ff'}}>
        <span style={{fontSize:15,fontWeight:600}}>{new Date().toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}</span>
        <div style={{display:'flex',gap:4}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4 2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
        </div>
      </div>

      <div style={{padding:'16px',textAlign:'center',borderBottom:'1px solid #c3c6d7'}}>
        <div style={{fontSize:13,color:'#434655',marginBottom:4}}>{settings?.name || 'АвтоМойка Про'}</div>
        <h1 style={{fontSize:22,fontWeight:700,color:'#141b2b',margin:0}}>Очередь на мойку</h1>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:6}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:isOnline?'#006e2d':'#ba1a1a',display:'inline-block'}}/>
          <span style={{fontSize:13,color:'#434655'}}>{isOnline ? 'Обновлено только что' : 'Нет соединения'}</span>
        </div>
      </div>

      <main style={{flex:1,padding:'24px 16px',paddingBottom:180,display:'flex',flexDirection:'column',gap:12}}>
        {active.length === 0 ? (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'64px 0',textAlign:'center'}}>
            <div style={{width:80,height:80,borderRadius:'50%',background:'#dbe1ff',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#004ac6"><path d="M17 5H3C1.9 5 1 5.9 1 7v10h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2V7c0-1.1-.9-2-2-2h-1V3h-2v2zM6 17.5c-.83 0-1.5-.67-1.5-1.5S5.17 14.5 6 14.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM3 11V7h14v4H3z"/></svg>
            </div>
            <h2 style={{fontSize:20,fontWeight:700,color:'#141b2b',margin:'0 0 8px'}}>Очередь пуста</h2>
            <p style={{fontSize:13,color:'#434655',margin:0}}>Вы можете заехать прямо сейчас!</p>
          </div>
        ) : (
          <>
            {active.map((entry) => {
              const isWashing = entry.status === 'washing'
              const wait = settings ? formatWaitTime(calcWaitMinutes(entry.position, settings)) : ''
              return (
                <div key={entry.id} style={{background:'#fff',borderRadius:12,padding:16,display:'flex',alignItems:'center',gap:16,border:'1px solid #c3c6d7',borderLeft:isWashing?'4px solid #2563eb':'1px solid #c3c6d7',boxShadow:isWashing?'0 4px 12px rgba(0,0,0,0.08)':'0 1px 3px rgba(0,0,0,0.06)'}}>
                  <div style={{width:44,height:44,flexShrink:0,borderRadius:'50%',background:isWashing?'#dbe1ff':'#f1f3ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'#004ac6'}}>{entry.position}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:700,letterSpacing:2,color:'#141b2b',textTransform:'uppercase'}}>{entry.plate_number}</div>
                    <div style={{fontSize:13,color:'#434655',marginTop:2}}>{isWashing?'Моется сейчас':wait}</div>
                  </div>
                  <div style={{padding:'4px 12px',borderRadius:999,fontSize:13,fontWeight:600,flexShrink:0,background:isWashing?'#dcfce7':'#dbeafe',color:isWashing?'#16a34a':'#2563eb'}}>{isWashing?'Моется':'Ожидает'}</div>
                </div>
              )
            })}
            <p style={{fontSize:13,color:'#434655',textAlign:'center',paddingTop:8}}>В очереди {active.length} автомобилей</p>
          </>
        )}
      </main>

      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:390,zIndex:50}}>
        <div style={{background:'linear-gradient(to top,#f9f9ff 60%,transparent)',padding:'32px 16px 16px'}}>
          <button onClick={() => router.push('/queue/join')} style={{width:'100%',height:52,background:'#2563eb',color:'#fff',fontWeight:700,fontSize:17,borderRadius:12,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 14px rgba(37,99,235,0.35)'}}>
            Встать в очередь
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
          </button>
        </div>
        <nav style={{display:'flex',justifyContent:'space-around',alignItems:'center',padding:'8px 16px 34px',background:'#f9f9ff',borderTop:'1px solid #c3c6d7'}}>
          <a href="#" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,textDecoration:'none',background:'#7cf994',color:'#007230',borderRadius:12,padding:'4px 16px'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
            <span style={{fontSize:13}}>Очередь</span>
          </a>
          <a href="#" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,textDecoration:'none',color:'#434655'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span style={{fontSize:13}}>Мои записи</span>
          </a>
          <a href="#" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,textDecoration:'none',color:'#434655'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            <span style={{fontSize:13}}>Профиль</span>
          </a>
        </nav>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@700&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
