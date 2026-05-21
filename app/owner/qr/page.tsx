'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function OwnerQRPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [washName, setWashName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [qrColor, setQrColor] = useState('#000000')
  const [logoFile, setLogoFile] = useState<string | null>(null)
  const [queueUrl, setQueueUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const COLORS = ['#000000','#1D4ED8','#16A34A','#DC2626','#7C3AED','#F59E0B']

  const fetchQRData = useCallback(async () => {
    const token = localStorage.getItem('owner_token')
    if (!token) { router.push('/owner'); return }
    try {
      const res = await fetch('/api/owner/qr', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) { router.push('/owner'); return }
      const json = await res.json()
      setQueueUrl(json.queue_url)
      setWashName(json.wash_name)
      setCompanyName(json.wash_name)
      setQrColor(json.qr_color || '#000000')
      if (json.logo_url) setLogoFile(json.logo_url)
    } finally { setLoading(false) }
  }, [router])

  useEffect(() => { fetchQRData() }, [fetchQRData])

  // Генерация QR через внешний API (без библиотек)
  const getQRImageUrl = (url: string, color: string, size: number = 300) => {
    const colorHex = color.replace('#', '')
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&color=${colorHex}&bgcolor=ffffff&margin=10&format=png`
  }

  // Рендер превью на canvas
  const renderCanvas = useCallback(async () => {
    if (!canvasRef.current || !queueUrl) return
    setGenerating(true)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const W = 400, H = 500
    canvas.width = W
    canvas.height = H

    // Background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)

    // Border
    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, W-2, H-2)

    // Top bar
    ctx.fillStyle = qrColor
    ctx.fillRect(0, 0, W, 8)

    let yOffset = 32

    // Logo
    if (logoFile) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject()
          img.src = logoFile
        })
        const maxH = 60, maxW = 160
        const scale = Math.min(maxW / img.width, maxH / img.height)
        const w = img.width * scale, h = img.height * scale
        ctx.drawImage(img, (W - w) / 2, yOffset, w, h)
        yOffset += h + 12
      } catch { yOffset += 8 }
    }

    // Company name
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 22px Inter, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(companyName || washName, W / 2, yOffset + 22)
    yOffset += 44

    // Subtitle — always shown
    ctx.fillStyle = '#6B7280'
    ctx.font = '14px Inter, Arial, sans-serif'
    ctx.fillText('Электронная очередь', W / 2, yOffset + 14)
    yOffset += 36

    // QR code
    const qrSize = 220
    try {
      const qrImg = new Image()
      qrImg.crossOrigin = 'anonymous'
      const qrUrl = getQRImageUrl(queueUrl, qrColor, 300)
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve()
        qrImg.onerror = () => reject()
        qrImg.src = qrUrl
      })
      const x = (W - qrSize) / 2
      ctx.drawImage(qrImg, x, yOffset, qrSize, qrSize)
    } catch {
      ctx.fillStyle = '#F3F4F6'
      ctx.fillRect((W-qrSize)/2, yOffset, qrSize, qrSize)
      ctx.fillStyle = '#9CA3AF'
      ctx.font = '13px Arial'
      ctx.fillText('QR-код', W/2, yOffset + qrSize/2)
    }
    yOffset += qrSize + 16

    // Instruction
    ctx.fillStyle = '#374151'
    ctx.font = '13px Inter, Arial, sans-serif'
    ctx.fillText('Отсканируйте чтобы встать в электронную очередь', W / 2, yOffset + 14)

    // Bottom bar
    ctx.fillStyle = qrColor
    ctx.fillRect(0, H-8, W, 8)

    setGenerating(false)
  }, [queueUrl, qrColor, companyName, washName, logoFile])

  useEffect(() => {
    if (!loading) renderCanvas()
  }, [loading, renderCanvas])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogoFile(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const downloadPNG = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `qr-${companyName || 'automojka'}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  const downloadSVG = () => {
    if (!queueUrl) return
    const colorHex = qrColor.replace('#','')
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="500" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="400" height="500" fill="white" stroke="#E5E7EB" stroke-width="2"/>
  <rect width="400" height="8" fill="${qrColor}"/>
  <text x="200" y="60" font-family="Arial" font-size="22" font-weight="bold" text-anchor="middle" fill="#111827">${companyName || washName}</text>
  <text x="200" y="88" font-family="Arial" font-size="14" text-anchor="middle" fill="#6B7280">Электронная очередь</text>
  <image href="${getQRImageUrl(queueUrl, qrColor, 300)}" x="90" y="105" width="220" height="220"/>
  <text x="200" y="355" font-family="Arial" font-size="12" text-anchor="middle" fill="#374151">Отсканируйте чтобы встать в электронную очередь</text>
  <rect y="492" width="400" height="8" fill="${qrColor}"/>
</svg>`
    const blob = new Blob([svgContent], {type:'image/svg+xml'})
    const link = document.createElement('a')
    link.download = `qr-${companyName || 'automojka'}.svg`
    link.href = URL.createObjectURL(blob)
    link.click()
  }

  const downloadPDF = async () => {
    if (!canvasRef.current) return
    const imgData = canvasRef.current.toDataURL('image/png')
    // Создаём HTML страницу для печати
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>QR-код очереди</title><style>
      body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}
      img{max-width:210mm;max-height:297mm}
      @media print{body{margin:0}@page{size:A4;margin:20mm}}
    </style></head><body><img src="${imgData}"/><script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`)
    win.document.close()
  }

  const saveSettings = async () => {
    const token = localStorage.getItem('owner_token')
    if (!token) return
    setSaving(true)
    try {
      await fetch('/api/owner/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ qr_color: qrColor, name: companyName, logo_url: logoFile }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#f9f9ff'}}>
      <div style={{width:32,height:32,border:'3px solid #e5e7eb',borderTopColor:'#2563eb',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{fontFamily:'Inter,sans-serif',background:'#F3F4F6',minHeight:'100vh',maxWidth:390,margin:'0 auto'}}>

      {/* Header */}
      <div style={{background:'#fff',borderBottom:'1px solid #E5E7EB',padding:'12px 16px',position:'sticky',top:0,zIndex:50,display:'flex',alignItems:'center',gap:12}}>
        <button onClick={() => router.push('/owner/settings')} style={{width:36,height:36,borderRadius:8,border:'none',background:'#F3F4F6',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#374151'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <div>
          <div style={{fontSize:12,color:'#6B7280'}}>Кабинет владельца</div>
          <div style={{fontSize:16,fontWeight:700,color:'#111827'}}>QR-код очереди</div>
        </div>
      </div>

      <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:12,paddingBottom:100}}>

        {/* Preview */}
        <div style={{background:'#fff',borderRadius:16,padding:16,display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12,alignSelf:'flex-start'}}>Предпросмотр</div>
          <canvas ref={canvasRef} style={{maxWidth:'100%',borderRadius:8,boxShadow:'0 2px 12px rgba(0,0,0,0.1)'}}/>
          {generating && <div style={{fontSize:12,color:'#6B7280',marginTop:8}}>Генерируем...</div>}
        </div>

        {/* Company name */}
        <div style={{background:'#fff',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Название на QR</div>
          <input
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder={washName}
            style={{width:'100%',height:44,borderRadius:10,border:'1px solid #E5E7EB',padding:'0 12px',fontSize:15,outline:'none',boxSizing:'border-box',color:'#111827'}}
          />
          <p style={{fontSize:12,color:'#6B7280',margin:'8px 0 0'}}>Отображается над QR-кодом</p>
        </div>

        {/* Logo */}
        <div style={{background:'#fff',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Логотип</div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            {logoFile && (
              <img src={logoFile} alt="logo" style={{height:48,maxWidth:100,objectFit:'contain',borderRadius:8,border:'1px solid #E5E7EB'}}/>
            )}
            <label style={{flex:1,height:44,background:'#F3F4F6',border:'1px dashed #D1D5DB',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:8,color:'#6B7280',fontSize:13}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z"/></svg>
              {logoFile ? 'Заменить логотип' : 'Загрузить логотип'}
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{display:'none'}}/>
            </label>
            {logoFile && (
              <button onClick={() => setLogoFile(null)} style={{width:36,height:36,borderRadius:8,background:'#FEE2E2',border:'none',cursor:'pointer',color:'#DC2626',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Color */}
        <div style={{background:'#fff',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Цвет QR-кода</div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            {COLORS.map(c => (
              <div key={c} onClick={() => setQrColor(c)}
                style={{width:36,height:36,borderRadius:'50%',background:c,cursor:'pointer',border:`3px solid ${qrColor===c?'#fff':'transparent'}`,boxShadow:qrColor===c?`0 0 0 3px ${c}`:'none',transition:'all .15s'}}/>
            ))}
            <label style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f)',cursor:'pointer',border:'2px solid #E5E7EB',overflow:'hidden',flexShrink:0}}>
              <input type="color" value={qrColor} onChange={e => setQrColor(e.target.value)} style={{opacity:0,width:'100%',height:'100%',cursor:'pointer'}}/>
            </label>
          </div>
        </div>

        {/* Queue URL */}
        <div style={{background:'#fff',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Ссылка очереди</div>
          <div style={{background:'#F3F4F6',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
            <span style={{fontSize:13,color:'#2563EB',wordBreak:'break-all',flex:1}}>{queueUrl}</span>
            <button onClick={() => navigator.clipboard.writeText(queueUrl)} style={{flexShrink:0,width:32,height:32,borderRadius:6,background:'#DBEAFE',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#2563EB'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            </button>
          </div>
          <p style={{fontSize:12,color:'#6B7280',margin:'8px 0 0'}}>Вставьте в карточку 2ГИС или поделитесь в мессенджере</p>
        </div>

        {/* Download */}
        <div style={{background:'#fff',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Скачать QR-код</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button onClick={downloadPNG} style={{height:48,background:'#EFF6FF',color:'#1D4ED8',fontWeight:600,fontSize:14,borderRadius:10,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:10,padding:'0 16px'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              Скачать PNG (высокое качество)
            </button>
            <button onClick={downloadSVG} style={{height:48,background:'#F5F3FF',color:'#6D28D9',fontWeight:600,fontSize:14,borderRadius:10,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:10,padding:'0 16px'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              Скачать SVG (для печати)
            </button>
            <button onClick={downloadPDF} style={{height:48,background:'#FEF2F2',color:'#B91C1C',fontWeight:600,fontSize:14,borderRadius:10,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:10,padding:'0 16px'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              Скачать PDF (A4, для печати)
            </button>
          </div>
        </div>

      </div>

      {/* Save */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:390,padding:'12px 16px 34px',background:'rgba(243,244,246,0.95)',backdropFilter:'blur(8px)',borderTop:'1px solid #E5E7EB'}}>
        <button onClick={saveSettings} disabled={saving}
          style={{width:'100%',height:52,background:saved?'#16A34A':saving?'#93C5FD':'#2563EB',color:'#fff',fontWeight:700,fontSize:16,borderRadius:12,border:'none',cursor:saving?'not-allowed':'pointer',transition:'background .2s',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {saved ? (
            <><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>Сохранено!</>
          ) : saving ? 'Сохраняем...' : 'Сохранить настройки QR'}
        </button>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');`}</style>
    </div>
  )
}
