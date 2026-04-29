/**
 * ResumenAgrupamiento.jsx
 * JetSmart Perú — Sistema Web de Traslados
 *
 * ══════════════════════════════════════════════════════════════
 *  INTEGRACIÓN EN CargaPage.jsx
 * ══════════════════════════════════════════════════════════════
 *
 * 1. IMPORTAR (al inicio de CargaPage.jsx):
 *
 *    import ResumenAgrupamiento, { calcularResumen } from '../components/ResumenAgrupamiento'
 *
 * 2. AGREGAR ESTADO (dentro del componente CargaPage):
 *
 *    const [resumenData, setResumenData] = useState(null)
 *
 * 3. LLAMAR AL FINAL de tu función ejecutarAgrupamiento(),
 *    cuando ya tienes los datos con GRUPO, ORDEN y CORREDOR asignados:
 *
 *    const resumen = calcularResumen(datos)
 *    setResumenData(resumen)
 *
 * 4. PONER EN EL JSX — en el espacio resaltado (zona morada del header):
 *
 *    {resumenData && <ResumenAgrupamiento resumen={resumenData} />}
 *
 * ══════════════════════════════════════════════════════════════
 *  MAPA DE COLUMNAS DataCargaM → campos del objeto fila
 *
 *  Col A (1)  DNI      → f.dni
 *  Col B (2)  #        → (se llena en NumerarFilas, no se necesita aquí)
 *  Col C (3)  FECHA    → f.fecha
 *  Col D (4)  E/S      → f.es
 *  Col E (5)  SERV     → f.serv
 *  Col F (6)  H.REAL   → f.hReal
 *  Col G (7)  PAX      → f.pax
 *  Col H (8)  PROV.    → f.prov
 *  Col I (9)  VUELO    → f.vuelo
 *  Col J (10) H.ATO    → f.hAto
 *  Col K (11) H.REC.   → f.hRec
 *  Col L (12) CAT.     → f.cat
 *  Col M (13) NOMBRES  → f.nombres
 *  Col W (23) GRUPO    → f.grupo
 *  Col X (24) ORDEN    → f.orden
 *  Col Y (25) CORREDOR → f.corredor
 *
 *  Si tu código usa otros nombres de clave, ajusta los accesos
 *  en calcularResumen() donde dice "🔧 AJUSTAR SI CAMBIA".
 * ══════════════════════════════════════════════════════════════
 */

import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
//  calcularResumen
//  Replica la macro NumerarFilas del Excel (sección hoja RESUMEN).
//  Recibe el array de filas ya agrupadas y devuelve el objeto de resumen.
// ─────────────────────────────────────────────────────────────────────────────
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
    // 🔧 AJUSTAR SI CAMBIA — nombres de clave en tu objeto fila
    const es       = String(f.es       ?? f['E/S']      ?? '').toUpperCase().trim()
    const vuelo    = String(f.vuelo    ?? f['VUELO']    ?? '')
    const pax      = Number(f.pax      ?? f['PAX']      ?? 0)
    const prov     = String(f.prov     ?? f['PROV.']    ?? '').trim()
    const orden    = Number(f.orden    ?? f['ORDEN']    ?? 0)
    const serv     = Number(f.serv     ?? f['SERV']     ?? 0)
    const corredor = String(f.corredor ?? f['CORREDOR'] ?? 'SIN CORREDOR').trim() || 'SIN CORREDOR'
    // ─────────────────────────────────────────────────────────

    if (serv > servMax) servMax = serv
    if (!es) continue

    if (es === 'E') { totalPaxE++; vuelosE.add(vuelo) }
    if (es === 'S') { totalPaxS++; vuelosS.add(vuelo) }

    // Solo filas cabecera (ORDEN=1) o solitarios (PAX=1) — igual que la macro
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
    nVuelosE: vuelosE.size,
    nVuelosS: vuelosS.size,
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


// ─────────────────────────────────────────────────────────────────────────────
//  Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function ResumenAgrupamiento({ resumen }) {
  const [open, setOpen] = useState(false)
  const [tab,  setTab]  = useState('kpis')

  if (!resumen) return null

  const { factorOcup, totalGrpE, totalGrpS, totalServ, totalVehiculos } = resumen

  const accentColor =
    factorOcup >= 2.5 ? '#15803d' :
    factorOcup >= 1.8 ? '#b45309' : '#b91c1c'

  const accentLabel =
    factorOcup >= 2.5 ? 'Óptimo' :
    factorOcup >= 1.8 ? 'Aceptable' : 'Bajo'

  const fechaStr = resumen.fecha
    ? resumen.fecha.toLocaleDateString('es-PE') + ' ' +
      resumen.fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <>
      {/* ── Chips + Botón Factor ── */}
      <div style={s.row}>
        <Chip label="Grupos E"  value={totalGrpE}       color="#2563eb" />
        <Chip label="Grupos S"  value={totalGrpS}       color="#7c3aed" />
        <Chip label="SERV"      value={totalServ}       color="#0891b2" />
        <Chip label="Vehículos" value={totalVehiculos}  color="#374151" />

        <button
          onClick={() => setOpen(true)}
          title="Ver Resumen de Agrupación"
          style={{ ...s.btnFactor, background: accentColor }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <IconCar />
          <span style={{ fontWeight: 700, fontSize: 15 }}>{factorOcup} pax/grp</span>
          <span style={s.badge}>{accentLabel}</span>
        </button>
      </div>

      {/* ── Modal ── */}
      {open && (
        <div style={s.overlay} onClick={() => setOpen(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>

            {/* Header del modal */}
            <div style={s.mHeader}>
              <div>
                <div style={s.mTitle}>✈ RESUMEN DE AGRUPACIÓN — JETSMART</div>
                <div style={s.mSub}>Generado: {fechaStr}</div>
              </div>
              <button onClick={() => setOpen(false)} style={s.btnX}>✕</button>
            </div>

            {/* Factor destacado */}
            <div style={{ ...s.factorCard, borderColor: accentColor }}>
              <div>
                <div style={s.factorLabel}>Factor de Ocupación Promedio (E)</div>
                <div style={{ ...s.factorNum, color: accentColor }}>
                  {factorOcup}
                  <span style={{ fontSize: 17, color: '#9ca3af', marginLeft: 6 }}>pax/grp</span>
                </div>
              </div>
              <span style={{ ...s.factorBadge, background: accentColor }}>{accentLabel}</span>
            </div>

            {/* Tabs */}
            <div style={s.tabBar}>
              {[
                { id: 'kpis',       txt: 'Indicadores generales' },
                { id: 'grupos',     txt: 'Distribución grupos' },
                { id: 'corredores', txt: 'Por corredor' },
              ].map(({ id, txt }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{ ...s.tabBtn, ...(tab === id ? s.tabActive : {}) }}
                >
                  {txt}
                </button>
              ))}
            </div>

            {/* Panel: Indicadores generales */}
            {tab === 'kpis' && (
              <div style={s.mBody}>
                <div style={s.kpiGrid}>
                  {[
                    ['Vuelos de recojo programados (E)',  resumen.nVuelosE,       null,      false, false],
                    ['Vuelos de retorno programados (S)', resumen.nVuelosS,       null,      true,  false],
                    ['Usuarios a trasladar (E)',          resumen.totalPaxE,      null,      false, false],
                    ['Usuarios a trasladar (S)',          resumen.totalPaxS,      null,      true,  false],
                    ['Grupos de recojo (E)',              resumen.totalGrpE,      '#2563eb', false, false],
                    ['Grupos de retorno (S)',             resumen.totalGrpS,      '#7c3aed', true,  false],
                    ['Total servicios (SERV)',            resumen.totalServ,      '#0891b2', false, false],
                    ['Factor de ocupación (E)',           `${factorOcup} pax/grp`, accentColor, true, false],
                    ['Corredores planificados',           resumen.nCorredores,    null,      false, false],
                    ['Vehículos Directo Auto',            resumen.nAuto,          null,      true,  false],
                    ['Vehículos Directo XL',              resumen.nXL,            null,      false, false],
                    ['Vehículos Directo Van',             resumen.nVan,           null,      true,  false],
                    ['Total vehículos',                  resumen.totalVehiculos, null,      false, true],
                  ].map(([label, val, vc, alt, bold]) => (
                    <div key={label} style={{
                      ...s.kpiRow,
                      background: alt ? '#f9fafb' : '#fff',
                      fontWeight: bold ? 700 : 400,
                    }}>
                      <span style={s.kpiLabel}>{label}</span>
                      <span style={{ ...s.kpiVal, color: vc || '#111' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Panel: Distribución grupos */}
            {tab === 'grupos' && (
              <div style={s.mBody}>
                <p style={s.sectionNote}>Distribución de grupos de RECOJO (E)</p>
                <table style={s.tbl}>
                  <thead>
                    <tr>
                      <Th left>Tamaño grupo</Th>
                      <Th>Cantidad</Th>
                      <Th>%</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['1 pax (solo)',   resumen.grpE1],
                      ['2 pax',         resumen.grpE2],
                      ['3 pax (lleno)', resumen.grpE3],
                    ].map(([lbl, qty], i) => {
                      const p = resumen.totalGrpE
                        ? ((qty / resumen.totalGrpE) * 100).toFixed(1)
                        : 0
                      return (
                        <tr key={lbl} style={{ background: i % 2 ? '#f9fafb' : '#fff' }}>
                          <Td left>{lbl}</Td>
                          <Td>{qty}</Td>
                          <Td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                              <div style={{ width: 60, height: 7, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(p, 100)}%`, height: '100%', background: '#2563eb', borderRadius: 4 }} />
                              </div>
                              <span style={{ fontSize: 12, minWidth: 38, color: '#374151' }}>{p}%</span>
                            </div>
                          </Td>
                        </tr>
                      )
                    })}
                    <tr style={{ background: '#dbeafe', fontWeight: 700 }}>
                      <Td left>TOTAL</Td>
                      <Td>{resumen.totalGrpE}</Td>
                      <Td>100%</Td>
                    </tr>
                  </tbody>
                </table>

                <p style={{ ...s.sectionNote, marginTop: 20 }}>Distribución de grupos de RETORNO (S)</p>
                <table style={s.tbl}>
                  <thead>
                    <tr>
                      <Th left>Tamaño grupo</Th>
                      <Th>Cantidad</Th>
                      <Th>%</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['1 pax (solo)',   resumen.grpS1],
                      ['2 pax',         resumen.grpS2],
                      ['3 pax (lleno)', resumen.grpS3],
                    ].map(([lbl, qty], i) => {
                      const p = resumen.totalGrpS
                        ? ((qty / resumen.totalGrpS) * 100).toFixed(1)
                        : 0
                      return (
                        <tr key={lbl} style={{ background: i % 2 ? '#f9fafb' : '#fff' }}>
                          <Td left>{lbl}</Td>
                          <Td>{qty}</Td>
                          <Td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                              <div style={{ width: 60, height: 7, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(p, 100)}%`, height: '100%', background: '#7c3aed', borderRadius: 4 }} />
                              </div>
                              <span style={{ fontSize: 12, minWidth: 38, color: '#374151' }}>{p}%</span>
                            </div>
                          </Td>
                        </tr>
                      )
                    })}
                    <tr style={{ background: '#ede9fe', fontWeight: 700 }}>
                      <Td left>TOTAL</Td>
                      <Td>{resumen.totalGrpS}</Td>
                      <Td>100%</Td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Panel: Por corredor */}
            {tab === 'corredores' && (
              <div style={s.mBody}>
                <table style={s.tbl}>
                  <thead>
                    <tr>
                      <Th left>Corredor</Th>
                      <Th>Grupos E</Th>
                      <Th>Grupos S</Th>
                      <Th>Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(resumen.corredores)
                      .sort((a, b) => (b[1].e + b[1].s) - (a[1].e + a[1].s))
                      .map(([corr, { e, s }], i) => (
                        <tr key={corr} style={{ background: i % 2 ? '#f9fafb' : '#fff' }}>
                          <Td left>
                            <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#2563eb', marginRight:8 }} />
                            {corr}
                          </Td>
                          <Td><span style={{ color:'#2563eb', fontWeight:600 }}>{e}</span></Td>
                          <Td><span style={{ color:'#7c3aed', fontWeight:600 }}>{s}</span></Td>
                          <Td><strong>{e + s}</strong></Td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}


// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Chip({ label, value, color }) {
  return (
    <div style={s.chip}>
      <span style={s.chipLabel}>{label}</span>
      <span style={{ ...s.chipVal, color }}>{value}</span>
    </div>
  )
}

function Th({ children, left }) {
  return (
    <th style={{ ...s.th, textAlign: left ? 'left' : 'center' }}>{children}</th>
  )
}
function Td({ children, left }) {
  return (
    <td style={{ ...s.td, textAlign: left ? 'left' : 'center' }}>{children}</td>
  )
}

function IconCar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2"/>
      <path d="M16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  )
}


// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  row: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },

  chip: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '4px 12px', minWidth: 58,
  },
  chipLabel: { fontSize: 10, color: '#6b7280', fontWeight: 500 },
  chipVal:   { fontSize: 15, fontWeight: 700 },

  btnFactor: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '7px 15px', borderRadius: 10, border: 'none',
    color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'opacity 0.15s',
  },
  badge: {
    background: 'rgba(255,255,255,0.22)', borderRadius: 6,
    padding: '2px 8px', fontSize: 11, fontWeight: 600,
  },

  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(2px)',
  },
  modal: {
    background: '#fff', borderRadius: 14,
    width: 640, maxWidth: '96vw', maxHeight: '92vh',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
  },

  mHeader: {
    background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)',
    color: '#fff', padding: '16px 22px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexShrink: 0,
  },
  mTitle: { fontWeight: 700, fontSize: 14, letterSpacing: 0.3 },
  mSub:   { fontSize: 11, opacity: 0.7, marginTop: 2 },
  btnX: {
    background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff',
    width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
    fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  factorCard: {
    border: '2px solid', padding: '12px 24px', flexShrink: 0,
    background: '#f8faff', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 20, borderLeft: 'none', borderRight: 'none', borderTop: 'none',
  },
  factorLabel: { fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 2 },
  factorNum:   { fontSize: 30, fontWeight: 800, lineHeight: 1 },
  factorBadge: {
    color: '#fff', padding: '4px 14px', borderRadius: 20,
    fontSize: 12, fontWeight: 700,
  },

  tabBar: {
    display: 'flex', borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb', flexShrink: 0,
  },
  tabBtn: {
    padding: '9px 16px', fontSize: 12, fontWeight: 500,
    border: 'none', background: 'transparent', cursor: 'pointer',
    borderBottom: '2px solid transparent', color: '#6b7280',
    fontFamily: 'inherit',
  },
  tabActive: {
    borderBottomColor: '#1d4ed8',
    color: '#1e3a5f', background: '#fff',
  },

  mBody: { padding: '18px 22px', overflowY: 'auto', flexGrow: 1 },

  kpiGrid: { borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' },
  kpiRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 14px', borderBottom: '1px solid #e5e7eb',
  },
  kpiLabel: { fontSize: 13, color: '#374151' },
  kpiVal:   { fontSize: 14, fontWeight: 700, minWidth: 36, textAlign: 'right' },

  tbl: {
    width: '100%', borderCollapse: 'collapse', fontSize: 13,
    border: '1px solid #e5e7eb',
  },
  th: {
    background: '#1e3a5f', color: '#fff',
    padding: '8px 12px', fontWeight: 600, fontSize: 12,
  },
  td: { padding: '7px 12px', borderBottom: '1px solid #f0f0f0' },

  sectionNote: { fontSize: 11, color: '#6b7280', marginBottom: 8, fontWeight: 600 },
}
