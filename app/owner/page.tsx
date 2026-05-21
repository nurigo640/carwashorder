'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OwnerLoginPage() {
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('owner_token')
    if (token) router.push('/owner/settings')
  }, [router])

  const handleLogin = async () => {
    if (!login || !password) { setError('Введите логин и пароль'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Ошибка входа'); return }
      localStorage.setItem('owner_token', json.token)
      localStorage.setItem('owner_name', json.owner.name)
      localStorage.setItem('wash_name', json.wash.name)
      localStorage.setItem('wash_id', json.wash.id)
      router.push('/owner/settings')
    } catch { setError('Нет соединения') }
    finally { setLoading(false) }
  }

  return (
    <div style={{fontFamily:'Inter,sans-serif',background:'#f9f9ff',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 16px'}}>

      {/* Logo */}
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{width:64,height:64,borderRadius:16,background:'linear-gradient(135deg,#1D4ED8,#2563eb)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M17 5H3C1.9 5 1 5.9 1 7v10h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2V7c0-1.1-.9-2-2-2h-1V3h-2v2zM6 17.5c-.83 0-1.5-.67-1.5-1.5S5.17 14.5 6 14.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM3 11V7h14v4H3z"/></svg>
        </div>
        <h1 style={{fontSize:22,fontWeight:700,color:'#111827',margin:'0 0 4px'}}>АвтоМойка Про</h1>
        <div style={{display:'inline-block',background:'#EDE9FE',color:'#7C3AED',fontSize:13,fontWeight:600,padding:'3px 12px',borderRadius:999}}>Кабинет владельца</div>
      </div>

      {/* Card */}
      <div style={{width:'100%',maxWidth:390,background:'#fff',borderRadius:20,boxShadow:'0 4px 24px rgba(0,0,0,0.08)',padding:'28px 24px'}}>
        <h2 style={{fontSize:20,fontWeight:700,color:'#111827',margin:'0 0 20px',textAlign:'center'}}>Войти</h2>

        <div style={{marginBottom:16}}>
          <label style={{fontSize:13,color:'#6B7280',display:'block',marginBottom:6}}>Логин</label>
          <div style={{position:'relative'}}>
            <div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#9CA3AF'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            <input
              type="text"
              value={login}
              onChange={e => { setLogin(e.target.value); setError('') }}
              placeholder="Введите логин"
              style={{width:'100%',height:48,borderRadius:12,border:'1px solid #E5E7EB',paddingLeft:40,paddingRight:12,fontSize:15,outline:'none',boxSizing:'border-box',background:'#F9FAFB',color:'#111827'}}
            />
          </div>
        </div>

        <div style={{marginBottom:20}}>
          <label style={{fontSize:13,color:'#6B7280',display:'block',marginBottom:6}}>Пароль</label>
          <div style={{position:'relative'}}>
            <div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#9CA3AF'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{width:'100%',height:48,borderRadius:12,border:'1px solid #E5E7EB',paddingLeft:40,paddingRight:44,fontSize:15,outline:'none',boxSizing:'border-box',background:'#F9FAFB',color:'#111827'}}
            />
            <button onClick={() => setShowPassword(!showPassword)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',padding:0}}>
              {showPassword
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
              }
            </button>
          </div>
        </div>

        {error && (
          <div style={{background:'#FEE2E2',border:'1px solid #FECACA',borderRadius:10,padding:'10px 14px',marginBottom:16,display:'flex',gap:8,alignItems:'center'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#DC2626"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            <span style={{fontSize:13,color:'#DC2626'}}>{error}</span>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{width:'100%',height:52,background:loading?'#93C5FD':'#2563EB',color:'#fff',fontWeight:700,fontSize:16,borderRadius:12,border:'none',cursor:loading?'not-allowed':'pointer',transition:'background .15s'}}>
          {loading ? 'Входим...' : 'Войти'}
        </button>

        <p style={{fontSize:12,color:'#9CA3AF',textAlign:'center',marginTop:16,marginBottom:0}}>
          Доступ только для владельцев мойки
        </p>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');`}</style>
    </div>
  )
}
