import { useState } from 'react'

export function calcularResumen(filas) {
  const vuelosE = new Set()
  const vuelosS = new Set()
  let totalPaxE = 0, totalPaxS = 0
  let grpE1 = 0, grpE2 = 0, grpE3 = 0
  let grpS1 = 0, grpS2 = 0, grpS3 = 0
  let nAuto = 0, nXL = 0, nVan = 0
  let servMax = 0
  const corredores = {}

  for (const f of filas) {
    const es       = String(f.es       ?? '').toUpperCase().trim()
    const vuelo    = String(f.vuelo    ?? '')
    const pax      = Number(f.pax      ?? 0)
    const prov     = String(f.prov     ?? '').trim()
    const orden    = Number(f.orden    ?? 0)
    const serv     = Number(f.serv     ?? 0)
    const corredor = String(f.corredor ?? 'SIN CORREDOR').trim() || 'SIN CORREDOR'

    if (serv > servMax) servMax = serv
    if (!es) continue

    if (es === 'E') { totalPaxE++; vuelosE.add(vuelo) }
    if (es === 'S') { totalPaxS++; vuelosS.add(vuelo) }

    if (orden === 1 || pax === 1) {
      if (es === 'E') {
        if      (pax === 1) grpE1++
        else if (pax === 2) grpE2++
        else                grpE3++
        if      (prov === 'Directo Auto') nAuto++
        else if (prov === 'Directo XL')   nXL++
        else if (prov === 'Directo Van')  nVan++
      } else if (es === 'S') {
        if      (pax === 1) grpS1++
        else if (pax === 2) grpS2++
        else                grpS3++
      }
      if (!corredores[corredor]) corredores[corredor] = { e: 0, s: 0 }
      if (es === 'E') corredores[corredor].e++
      else            corredores[corredor].s++
    }
  }

  const totalGrpE  = grpE1 + grpE2 + grpE3
  const totalGrpS  = grpS1 + grpS2 + grpS3
  const factorOcup = totalGrpE > 0
    ? Math.round((totalPaxE / totalGrpE) * 100) / 100
    : 0

  return {
    fecha: new Date(),
    nVuelosE: vuelosE.size, nVuelosS: vuelosS.size,
    totalPaxE, totalPaxS,
    totalGrpE, totalGrpS,
    totalServ: servMax,
    factorOcup,
    nCorredores: Object.keys(corredores).filter(c => c !== 'SIN CORREDOR').length,
    nAuto, nXL, nVan,
    totalVehiculos: nAuto + nXL + nVan,
    grpE1, grpE2, grpE3,
    grpS1, grpS2, grpS3,
    corredores,
  }
}

function exportarResumenCSV(resumen) {
  const fecha = resumen.fecha
    ? resumen.fecha.toLocaleDateString('es-PE') + ' ' +
      resumen.fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : ''
  const rows = []
  rows.push(['RESUMEN DE AGRUPACIÓN - JETSMART'])
  rows.push(['Fecha generación:', fecha])
  rows.push([])
  rows.push(['INDICADORES GENERALES'])
  rows.push(['Indicador', 'Valor'])
  rows.push(['Vuelos de recojo programados (E)',  resumen.nVuelosE])
  rows.push(['Vuelos de retorno programados (S)', resumen.nVuelosS])
  rows.push(['Usuarios a trasladar (E)',          resumen.totalPaxE])
  rows.push(['Usuarios a trasladar (S)',          resumen.totalPaxS])
  rows.push(['Grupos de recojo (E)',              resumen.totalGrpE])
  rows.push(['Grupos de retorno (S)',             resumen.totalGrpS])
  rows.push(['Total servicios (SERV)',            resumen.totalServ])
  rows.push(['Factor de ocupación promedio (E)',  resumen.factorOcup + ' pax/grp'])
  rows.push(['Corredores planificados',           resumen.nCorredores])
  rows.push(['Vehículos Directo Auto',            resumen.nAuto])
  rows.push(['Vehículos Directo XL',              resumen.nXL])
  rows.push(['Vehículos Directo Van',             resumen.nVan])
  rows.push(['Total vehículos',                  resumen.totalVehiculos])
  rows.push([])
  rows.push(['DISTRIBUCIÓN GRUPOS RECOJO (E)'])
  rows.push(['Tamaño grupo', 'Cantidad', '%'])
  const pctE = n => resumen.totalGrpE > 0 ? ((n/resumen.totalGrpE)*100).toFixed(1)+'%' : '0%'
  rows.push(['1 pax (solo)',   resumen.grpE1, pctE(resumen.grpE1)])
  rows.push(['2 pax',         resumen.grpE2, pctE(resumen.grpE2)])
  rows.push(['3 pax (lleno)', resumen.grpE3, pctE(resumen.grpE3)])
  rows.push(['TOTAL',         resumen.totalGrpE, '100%'])
  rows.push([])
  rows.push(['DISTRIBUCIÓN GRUPOS RETORNO (S)'])
  rows.push(['Tamaño grupo', 'Cantidad', '%'])
  const pctS = n => resumen.totalGrpS > 0 ? ((n/resumen.totalGrpS)*100).toFixed(1)+'%' : '0%'
  rows.push(['1 pax (solo)',   resumen.grpS1, pctS(resumen.grpS1)])
  rows.push(['2 pax',         resumen.grpS2, pctS(resumen.grpS2)])
  rows.push(['3 pax (lleno)', resumen.grpS3, pctS(resumen.grpS3)])
  rows.push(['TOTAL',         resumen.totalGrpS, '100%'])
  rows.push([])
  rows.push(['GRUPOS POR CORREDOR'])
  rows.push(['Corredor', 'Grupos E', 'Grupos S', 'Total'])
  Object.entries(resumen.corredores)
    .sort((a, b) => (b[1].e + b[1].s) - (a[1].e + a[1].s))
    .forEach(([corr, { e, s }]) => rows.push([corr, e, s, e + s]))

  const csv = rows.map(r =>
    r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ResumenAgrupamiento_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Semáforo: < 1.55 Bajo | 1.55-1.59 En meta | 1.60-1.79 Bueno | >= 1.80 Óptimo
function getColor(f) {
  if (f < 1.55) return '#c62828'
  if (f < 1.60) return '#e65100'
  if (f < 1.80) return '#1565c0'
  return '#2e7d32'
}
function getLabel(f) {
  if (f < 1.55) return 'Bajo'
  if (f < 1.60) return 'En meta'
  if (f < 1.80) return 'Bueno'
  return 'Óptimo'
}

function IconAuto() {
  return (
    <svg width="28" height="16" viewBox="0 0 56 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 18 L14 6 H42 L50 18 L52 22 H4 L6 18Z" fill="white" fillOpacity="0.85"/>
      <rect x="3" y="18" width="50" height="8" rx="3" fill="white" fillOpacity="0.6"/>
      <circle cx="14" cy="26" r="4" fill="white" fillOpacity="0.5" stroke="white" strokeWidth="1.5"/>
      <circle cx="42" cy="26" r="4" fill="white" fillOpacity="0.5" stroke="white" strokeWidth="1.5"/>
      <rect x="16" y="8"  width="9"  height="7" rx="1.5" fill="white" fillOpacity="0.35"/>
      <rect x="28" y="8"  width="11" height="7" rx="1.5" fill="white" fillOpacity="0.35"/>
      <rect x="4"  y="19" width="6"  height="3" rx="1"   fill="white" fillOpacity="0.6"/>
      <rect x="46" y="19" width="6"  height="3" rx="1"   fill="white" fillOpacity="0.6"/>
    </svg>
  )
}

function Chip({ label, value, color }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', background:'white', border:'1px solid #e0e0e0', borderRadius:'8px', padding:'4px 14px', minWidth:58 }}>
      <span style={{ fontSize:10, color:'#888', fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:15, fontWeight:700, color }}>{value}</span>
    </div>
  )
}

function Th({ children, left }) {
  return <th style={{ background:'#1a2235', color:'#fff', padding:'8px 12px', fontWeight:600, fontSize:12, textAlign: left ? 'left' : 'center' }}>{children}</th>
}
function Td({ children, left }) {
  return <td style={{ padding:'7px 12px', borderBottom:'1px solid #f0f0f0', fontSize:13, textAlign: left ? 'left' : 'center' }}>{children}</td>
}

export default function ResumenAgrupamiento({ resumen }) {
  const [open, setOpen] = useState(false)
  const [tab,  setTab]  = useState('kpis')

  if (!resumen) return null

  const { factorOcup, totalGrpE, totalGrpS, totalServ, totalVehiculos } = resumen
  const color = getColor(factorOcup)
  const label = getLabel(factorOcup)
  const fechaStr = resumen.fecha
    ? resumen.fecha.toLocaleDateString('es-PE') + ' ' +
      resumen.fecha.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })
    : ''

  return (
    <>
      {/* ── Chips + Botón — van inline en la fila de stats ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <Chip label="Grupos E"  value={totalGrpE}      color="#2e7d32" />
        <Chip label="Grupos S"  value={totalGrpS}      color="#1565c0" />
        <Chip label="SERV"      value={totalServ}      color="#0891b2" />
        <Chip label="Vehículos" value={totalVehiculos} color="#374151" />
        <button
          onClick={() => setOpen(true)}
          style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'6px 16px', borderRadius:10, border:'none',
            background: color, color:'#fff', cursor:'pointer',
            fontFamily:'inherit', fontWeight:600, fontSize:14,
            boxShadow:'0 2px 8px rgba(0,0,0,0.18)',
          }}
        >
          <IconAuto />
          <span>{factorOcup} pax/grp</span>
          <span style={{ background:'rgba(255,255,255,0.22)', borderRadius:6, padding:'2px 8px', fontSize:11 }}>{label}</span>
        </button>
      </div>

      {/* ── Modal ── */}
      {open && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(2px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ background:'#fff', borderRadius:14, width:660, maxWidth:'96vw', maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.28)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header modal */}
            <div style={{ background:'linear-gradient(135deg,#1a2235,#1565c0)', color:'#fff', padding:'16px 22px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, letterSpacing:0.3 }}>✈ RESUMEN DE AGRUPACIÓN — JETSMART</div>
                <div style={{ fontSize:11, opacity:0.7, marginTop:2 }}>Generado: {fechaStr}</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <button
                  onClick={() => exportarResumenCSV(resumen)}
                  style={{ background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.35)', color:'#fff', padding:'5px 12px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit' }}
                >
                  📥 Exportar CSV
                </button>
                <button
                  onClick={() => setOpen(false)}
                  style={{ background:'rgba(255,255,255,0.18)', border:'none', color:'#fff', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}
                >✕</button>
              </div>
            </div>

            {/* Factor destacado */}
            <div style={{ borderBottom:`3px solid ${color}`, padding:'12px 24px', background:'#f8faff', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', gap:24 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:11, color:'#888', fontWeight:500, marginBottom:2 }}>Factor de Ocupación Promedio (E)</div>
                <div style={{ fontSize:32, fontWeight:800, color, lineHeight:1 }}>
                  {factorOcup} <span style={{ fontSize:16, color:'#9ca3af' }}>pax/grp</span>
                </div>
              </div>
              <div style={{ borderLeft:'1px solid #e0e0e0', paddingLeft:24, fontSize:12, color:'#555', lineHeight:1.8 }}>
                <div>🔴 &lt; 1.55 → <strong>Bajo</strong></div>
                <div>🟠 1.55 – 1.59 → <strong>En meta</strong></div>
                <div>🔵 1.60 – 1.79 → <strong>Bueno</strong></div>
                <div>🟢 ≥ 1.80 → <strong>Óptimo</strong></div>
              </div>
              <span style={{ background:color, color:'#fff', padding:'6px 18px', borderRadius:20, fontSize:13, fontWeight:700 }}>{label}</span>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid #e0e0e0', background:'#f9fafb', flexShrink:0 }}>
              {[
                { id:'kpis',       txt:'Indicadores' },
                { id:'grupos',     txt:'Distribución grupos' },
                { id:'corredores', txt:'Por corredor' },
              ].map(({ id, txt }) => (
                <button key={id} onClick={() => setTab(id)} style={{
                  padding:'9px 18px', fontSize:12, fontWeight:500,
                  border:'none', background:'transparent', cursor:'pointer',
                  borderBottom: tab===id ? '2px solid #1565c0' : '2px solid transparent',
                  color: tab===id ? '#1a2235' : '#6b7280',
                  fontFamily:'inherit',
                }}>{txt}</button>
              ))}
            </div>

            {/* Body scrollable */}
            <div style={{ padding:'18px 22px', overflowY:'auto', flexGrow:1 }}>

              {/* Panel Indicadores */}
              {tab === 'kpis' && (
                <div style={{ borderRadius:8, overflow:'hidden', border:'1px solid #e5e7eb' }}>
                  {[
                    ['Vuelos de recojo programados (E)',  resumen.nVuelosE,       null,      false],
                    ['Vuelos de retorno programados (S)', resumen.nVuelosS,       null,      true],
                    ['Usuarios a trasladar (E)',          resumen.totalPaxE,      null,      false],
                    ['Usuarios a trasladar (S)',          resumen.totalPaxS,      null,      true],
                    ['Grupos de recojo (E)',              resumen.totalGrpE,      '#2e7d32', false],
                    ['Grupos de retorno (S)',             resumen.totalGrpS,      '#1565c0', true],
                    ['Total servicios (SERV)',            resumen.totalServ,      '#0891b2', false],
                    ['Factor de ocupación (E)',           `${factorOcup} pax/grp`, color,   true],
                    ['Corredores planificados',           resumen.nCorredores,    null,      false],
                    ['Vehículos Directo Auto',            resumen.nAuto,          null,      true],
                    ['Vehículos Directo XL',              resumen.nXL,            null,      false],
                    ['Vehículos Directo Van',             resumen.nVan,           null,      true],
                    ['Total vehículos',                  resumen.totalVehiculos, null,      false],
                  ].map(([lbl, val, vc, alt]) => (
                    <div key={lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 14px', borderBottom:'1px solid #e5e7eb', background: alt ? '#f9fafb' : '#fff' }}>
                      <span style={{ fontSize:13, color:'#374151' }}>{lbl}</span>
                      <span style={{ fontSize:14, fontWeight:700, color: vc || '#111', minWidth:36, textAlign:'right' }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Panel Distribución */}
              {tab === 'grupos' && (
                <>
                  <p style={{ fontSize:11, color:'#888', fontWeight:600, marginBottom:8 }}>RECOJO (E)</p>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, border:'1px solid #e5e7eb', marginBottom:20 }}>
                    <thead><tr><Th left>Tamaño grupo</Th><Th>Cantidad</Th><Th>%</Th></tr></thead>
                    <tbody>
                      {[['1 pax (solo)',resumen.grpE1],['2 pax',resumen.grpE2],['3 pax (lleno)',resumen.grpE3]].map(([lbl,qty],i) => {
                        const p = resumen.totalGrpE ? ((qty/resumen.totalGrpE)*100).toFixed(1) : 0
                        return (
                          <tr key={lbl} style={{ background: i%2 ? '#f9fafb':'#fff' }}>
                            <Td left>{lbl}</Td><Td>{qty}</Td>
                            <Td>
                              <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
                                <div style={{ width:60, height:7, background:'#e5e7eb', borderRadius:4, overflow:'hidden' }}>
                                  <div style={{ width:`${Math.min(p,100)}%`, height:'100%', background:'#2e7d32', borderRadius:4 }}/>
                                </div>
                                <span style={{ fontSize:12, minWidth:38 }}>{p}%</span>
                              </div>
                            </Td>
                          </tr>
                        )
                      })}
                      <tr style={{ background:'#e8f5e9', fontWeight:700 }}>
                        <Td left>TOTAL</Td><Td>{resumen.totalGrpE}</Td><Td>100%</Td>
                      </tr>
                    </tbody>
                  </table>

                  <p style={{ fontSize:11, color:'#888', fontWeight:600, marginBottom:8 }}>RETORNO (S)</p>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, border:'1px solid #e5e7eb' }}>
                    <thead><tr><Th left>Tamaño grupo</Th><Th>Cantidad</Th><Th>%</Th></tr></thead>
                    <tbody>
                      {[['1 pax (solo)',resumen.grpS1],['2 pax',resumen.grpS2],['3 pax (lleno)',resumen.grpS3]].map(([lbl,qty],i) => {
                        const p = resumen.totalGrpS ? ((qty/resumen.totalGrpS)*100).toFixed(1) : 0
                        return (
                          <tr key={lbl} style={{ background: i%2 ? '#f9fafb':'#fff' }}>
                            <Td left>{lbl}</Td><Td>{qty}</Td>
                            <Td>
                              <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
                                <div style={{ width:60, height:7, background:'#e5e7eb', borderRadius:4, overflow:'hidden' }}>
                                  <div style={{ width:`${Math.min(p,100)}%`, height:'100%', background:'#1565c0', borderRadius:4 }}/>
                                </div>
                                <span style={{ fontSize:12, minWidth:38 }}>{p}%</span>
                              </div>
                            </Td>
                          </tr>
                        )
                      })}
                      <tr style={{ background:'#e3f2fd', fontWeight:700 }}>
                        <Td left>TOTAL</Td><Td>{resumen.totalGrpS}</Td><Td>100%</Td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {/* Panel Corredores */}
              {tab === 'corredores' && (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, border:'1px solid #e5e7eb' }}>
                  <thead><tr><Th left>Corredor</Th><Th>Grupos E</Th><Th>Grupos S</Th><Th>Total</Th></tr></thead>
                  <tbody>
                    {Object.entries(resumen.corredores)
                      .sort((a,b) => (b[1].e+b[1].s)-(a[1].e+a[1].s))
                      .map(([corr,{e,s}],i) => (
                        <tr key={corr} style={{ background: i%2 ? '#f9fafb':'#fff' }}>
                          <Td left>
                            <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#1565c0', marginRight:8 }}/>
                            {corr}
                          </Td>
                          <Td><span style={{ color:'#2e7d32', fontWeight:600 }}>{e}</span></Td>
                          <Td><span style={{ color:'#1565c0', fontWeight:600 }}>{s}</span></Td>
                          <Td><strong>{e+s}</strong></Td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
