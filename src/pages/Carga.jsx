import { useState } from 'react'
import * as XLSX from 'xlsx'

function Carga() {
  const [datos, setDatos] = useState([])
  const [archivo, setArchivo] = useState(null)
  const [cargando, setCargando] = useState(false)

  const handleArchivo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setArchivo(file.name)
    setCargando(true)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const workbook = XLSX.read(evt.target.result, { type: 'binary' })

      const hojas = workbook.SheetNames
      const nombreHoja = hojas.find(n =>
        n.toLowerCase().includes('data') ||
        n.toLowerCase().includes('carga') ||
        n.toLowerCase().includes('mov') ||
        n.toLowerCase().includes('tripul')
      ) || hojas[0]

      const hoja = workbook.Sheets[nombreHoja]
      if (!hoja) {
        alert('No se pudo leer el archivo.')
        setCargando(false)
        return
      }

      const filas = XLSX.utils.sheet_to_json(hoja)
      const procesados = filas.map((f, i) => ({
        id: i,
        activo: true,
        dni: f['DNI'] || f['dni'] || '',
        nombre: f['NOMBRES'] || f['NOMBRE'] || f['nombre'] || '',
        cargo: f['CAT.'] || f['CARGO'] || f['cargo'] || '',
        direccion: f['DIRECCION'] || f['dirección'] || '',
        distrito: f['DISTRITO'] || f['distrito'] || '',
        corredor: f['CORREDOR'] || f['corredor'] || '',
        tipo: f['E/S'] || f['TIPO'] || f['tipo'] || '',
        vuelo: f['VUELO'] || f['vuelo'] || '',
        hora_vuelo: f['H.REAL'] || f['HORA'] || f['hora'] || '',
        pax: f['PAX'] || f['pax'] || 1,
        lat: f['LAT.'] || f['LAT'] || f['lat'] || null,
        lng: f['LONG.'] || f['LONG'] || f['lng'] || null,
        grupo: f['GRUPO'] || f['grupo'] || '',
        orden: f['ORDEN'] || f['orden'] || '',
        serv: f['SERV'] || f['serv'] || '',
      }))
      setDatos(procesados)
      setCargando(false)
    }
    reader.readAsBinaryString(file)
  }

  const toggleActivo = (id) => {
    setDatos(datos.map(d => d.id === id ? { ...d, activo: !d.activo } : d))
  }

  const editarCorredor = (id, valor) => {
    setDatos(datos.map(d => d.id === id ? { ...d, corredor: valor } : d))
  }

  const totalActivos = datos.filter(d => d.activo).length
  const entradas = datos.filter(d => d.activo && d.tipo === 'E').length
  const salidas = datos.filter(d => d.activo && d.tipo === 'S').length

  return (
    <div style={{ padding: '32px', background: '#f4f6f9', minHeight: '100vh' }}>
      <h2 style={{ color: '#1a2235', marginBottom: '8px' }}>📂 Carga de Datos</h2>
      <p style={{ color: '#667788', marginBottom: '32px' }}>
        Importa el archivo Excel con los tripulantes del día
      </p>

      {/* Zona de carga */}
      <div style={{
        background: 'white',
        border: '2px dashed #c0ccd8',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <p style={{ color: '#667788', marginBottom: '16px' }}>
          {archivo ? `✅ Archivo cargado: ${archivo}` : 'Selecciona el archivo Excel con los datos del día'}
        </p>
        <label style={{
          padding: '12px 24px',
          background: '#00b4d8',
          color: 'white',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          display: 'inline-block'
        }}>
          {cargando ? 'Procesando...' : 'Seleccionar archivo Excel'}
          <input
            type="file"
            accept=".xlsx,.xlsm,.xls"
            onChange={handleArchivo}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {datos.length > 0 && (
        <>
          {/* Estadísticas */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total tripulantes', valor: datos.length, color: '#1a2235' },
              { label: 'Activos', valor: totalActivos, color: '#00b4d8' },
              { label: 'Entradas (E)', valor: entradas, color: '#00cc88' },
              { label: 'Salidas (S)', valor: salidas, color: '#ffaa00' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'white',
                borderRadius: '10px',
                padding: '16px 24px',
                flex: 1,
                border: '1px solid #e0e8f0',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <div style={{ fontSize: '28px', color: stat.color, fontWeight: 'bold' }}>
                  {stat.valor}
                </div>
                <div style={{ color: '#667788', fontSize: '13px', marginTop: '4px' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Botón agrupar */}
          <div style={{ marginBottom: '24px', textAlign: 'right' }}>
            <button style={{
              padding: '12px 32px',
              background: '#00cc88',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,204,136,0.3)'
            }}>
              ⚡ Ejecutar Agrupamiento
            </button>
          </div>

          {/* Tabla */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e0e8f0',
            overflow: 'auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#f4f6f9' }}>
                  {['Activo', 'DNI', 'Nombre', 'Cargo', 'Tipo', 'Vuelo', 'Corredor', 'Distrito', 'PAX'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      color: '#667788',
                      textAlign: 'left',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      borderBottom: '2px solid #e0e8f0'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.map(d => (
                  <tr key={d.id} style={{
                    borderTop: '1px solid #f0f4f8',
                    opacity: d.activo ? 1 : 0.4,
                    background: d.activo ? 'white' : '#f9fafb'
                  }}>
                    <td style={{ padding: '10px 16px' }}>
                      <input
                        type="checkbox"
                        checked={d.activo}
                        onChange={() => toggleActivo(d.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                    <td style={{ padding: '10px 16px', color: '#667788', fontSize: '13px' }}>{d.dni}</td>
                    <td style={{ padding: '10px 16px', color: '#1a2235', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>{d.nombre}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: '#e8f7fb',
                        color: '#00b4d8',
                        fontSize: '11px',
                        whiteSpace: 'nowrap'
                      }}>{d.cargo}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: d.tipo === 'E' ? '#e8faf4' : '#fff8e8',
                        color: d.tipo === 'E' ? '#00cc88' : '#ffaa00',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>{d.tipo}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#667788', fontSize: '13px' }}>{d.vuelo}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <input
                        value={d.corredor}
                        onChange={e => editarCorredor(d.id, e.target.value)}
                        style={{
                          background: '#f4f6f9',
                          border: '1px solid #e0e8f0',
                          borderRadius: '6px',
                          color: '#1a2235',
                          padding: '4px 8px',
                          fontSize: '12px',
                          width: '140px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '10px 16px', color: '#667788', fontSize: '13px', whiteSpace: 'nowrap' }}>{d.distrito}</td>
                    <td style={{ padding: '10px 16px', color: '#667788', fontSize: '13px', textAlign: 'center' }}>{d.pax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default Carga