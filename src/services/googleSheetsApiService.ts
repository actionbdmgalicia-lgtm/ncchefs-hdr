// ╔══════════════════════════════════════════════════════════════════════╗
// ║  NCCHEFS – Google Sheets API Service                                ║
// ║                                                                      ║
// ║  Lee Google Sheets directamente via Sheets API v4 (sin Apps Script) ║
// ║  Requisitos:                                                         ║
// ║    1. La hoja debe ser "pública para ver" (Compartir → Cualquiera    ║
// ║       con el enlace → Ver)                                           ║
// ║    2. VITE_GOOGLE_SHEETS_API_KEY en .env.local                       ║
// ╚══════════════════════════════════════════════════════════════════════╝

import type { SheetCoordConfig, SheetWeddingRaw } from '../types'

const SHEETS_API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY as string | undefined
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const SKIP_SHEETS_KW = ['tabla unificada', 'tabla', 'consolidado', 'resumen']

// ─── URL UTILS ────────────────────────────────────────────────────────────────

export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

export function isValidSheetUrl(url: string): boolean {
  return url.includes('docs.google.com/spreadsheets')
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

type CellValue = string | number | boolean | null | undefined
type Row = CellValue[]

function safeStr(val: CellValue): string {
  if (val === null || val === undefined || val === '') return ''
  if (typeof val === 'string') {
    const s = val.replace(/[\u200b\u202c\u202a\ufeff]/g, '').trim()
    if (s.startsWith('#')) return ''
    return s
  }
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? '' : String(val)
  if (typeof val === 'boolean') return String(val)
  return String(val).trim()
}

function safeNum(val: CellValue): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : val
  if (typeof val === 'string') {
    if (val.startsWith('#')) return 0
    const n = parseFloat(val.replace(',', '.'))
    return isNaN(n) ? 0 : n
  }
  return 0
}

function sw(text: string, prefix: string): boolean {
  return text.trim().toLowerCase().startsWith(prefix.toLowerCase())
}

function findSection(rows: Row[], keyword: string): number {
  const kw = keyword.toLowerCase()
  for (let i = 0; i < rows.length; i++) {
    if (safeStr(rows[i][0]).toLowerCase().includes(kw)) return i
  }
  return -1
}

// ─── DATE PARSING (formato español DD/MM/YYYY → ISO YYYY-MM-DD) ──────────────

export function parseSpanishDate(val: CellValue): string {
  const s = safeStr(val).trim()
  if (!s) return ''

  // Ya está en ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // DD/MM/YYYY  DD/MM/YY  DD.MM.YYYY  DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})$/)
  if (m) {
    const day   = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    const year  = m[3].length === 2 ? '20' + m[3] : m[3]
    // Validar que mes y día sean coherentes
    const d = parseInt(day), mo = parseInt(month)
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      return `${year}-${month}-${day}`
    }
  }

  return s  // devolver tal cual si no se reconoce
}

// ─── PARSE BASIC INFO ─────────────────────────────────────────────────────────

function parseBasicInfo(rows: Row[], sheetName: string, fileSource: string) {
  const info = {
    couples_name: sheetName.trim(),
    clients: '', date: '', coordinator: '',
    adults: 0, children: 0, professionals: 0,
    service_type: '', ceremony_type: '', ceremony_time: '', ceremony_place: '',
    start_time: '', end_time: '',
    file_source: fileSource,
  }
  rows.slice(0, 25).forEach(row => {
    const c0 = safeStr(row[0])
    const c0l = c0.toLowerCase()
    const c1 = safeStr(row[1])

    if (c0l.startsWith('cliente')) {
      const m = c0.match(/cliente[s]?\s*[:\-]?\s*(.+)/i)
      info.clients = (m && m[1].trim()) ? m[1].trim() : c1
    }
    if (c0l.startsWith('fecha') && row[1]) info.date = parseSpanishDate(row[1])
    if (c0l.startsWith('coordinad') && row[1]) info.coordinator = safeStr(row[1])

    if (c0l.startsWith('adultos')) {
      info.adults = parseInt(String(safeNum(row[1]))) || 0
      // Look for niños in same row
      for (let ci = 1; ci < Math.min(row.length, 8); ci++) {
        const cv = safeStr(row[ci]).toLowerCase()
        if (cv.includes('niño') || cv.includes('nino')) {
          info.children = parseInt(String(safeNum(row[ci + 1]))) || 0
        }
      }
    }

    // Professional/staff count
    if (c0l.includes('profesional') && row[1]) {
      info.professionals = parseInt(String(safeNum(row[1]))) || 0
    }

    // Service and ceremony types
    if (c0l.includes('tipo') && c0l.includes('servicio') && row[1]) {
      info.service_type = safeStr(row[1])
    }
    if (c0l.includes('tipo') && c0l.includes('ceremonia') && row[1]) {
      info.ceremony_type = safeStr(row[1])
    }

    // Ceremony time and place
    if ((c0l.includes('hora') || c0l.includes('horario')) && c0l.includes('ceremonia') && row[1]) {
      info.ceremony_time = safeStr(row[1])
    }
    if (c0l.includes('lugar') && c0l.includes('ceremonia') && row[1]) {
      info.ceremony_place = safeStr(row[1])
    }

    // Service start/end times
    if ((c0l.includes('hora') || c0l.includes('inicio')) && !c0l.includes('ceremonia') && row[1]) {
      info.start_time = safeStr(row[1])
    }
    if ((c0l.includes('hora') || c0l.includes('fin') || c0l.includes('cierre')) && row[1]) {
      info.end_time = safeStr(row[1])
    }
  })
  return info
}

// ─── PARSE MENU ───────────────────────────────────────────────────────────────

interface SpecialMenuDetail {
  nombre: string
  mesa: string
  intolerancia: string
  modificaciones?: string[]
}

function parseMenu(rows: Row[]): {
  menu: Record<string, unknown>
  special_menus: Record<string, number>
  special_menus_detailed: SpecialMenuDetail[]
} {
  const menu: {
    aperitivos: string[]; complementos: string[]; marisco: string[]; tapa: string[]
    entrante: string; pescado: string; carne: string; postre: string
    infantil: { menu: string[]; postre: string; notas: string }
    recena: string[]
    bodega: { blanco: string; tinto: string; cava: string; otros: string }
  } = {
    aperitivos: [], complementos: [], marisco: [], tapa: [],
    entrante: '', pescado: '', carne: '', postre: '',
    infantil: { menu: [], postre: '', notas: '' },
    recena: [],
    bodega: { blanco: '', tinto: '', cava: '', otros: '' },
  }
  const special_menus: Record<string, number> = {
    celiacos: 0, vegetarianos: 0, infantil: 0,
    sin_marisco: 0, sin_pescado: 0, sin_carne: 0,
    sin_lactosa: 0, alergicos: 0, embarazadas: 0,
  }
  let special_menus_detailed: SpecialMenuDetail[] = []

  let menuStart = findSection(rows, 'menú cocina')
  if (menuStart < 0) menuStart = findSection(rows, 'menu cocina')
  let infantilStart = findSection(rows, 'menú infantil')
  if (infantilStart < 0) infantilStart = findSection(rows, 'menu infantil')
  const recenaStart = findSection(rows, 'recena')
  const bodegaStart = findSection(rows, 'bodega')
  let specialStart = findSection(rows, 'menús especiales')
  if (specialStart < 0) specialStart = findSection(rows, 'menus especiales')

  const mainEndKws = ['menú infantil', 'menu infantil', 'recena', 'menús especiales', 'menus especiales', 'bodega', 'barra']

  // ── Menú principal ──
  if (menuStart >= 0) {
    let menuEnd = rows.length
    for (let i = menuStart + 1; i < rows.length; i++) {
      const h = safeStr(rows[i][0]).toLowerCase()
      if (mainEndKws.some(kw => h.includes(kw))) { menuEnd = i; break }
    }
    let cur: string | null = null
    rows.slice(menuStart + 1, menuEnd).forEach(row => {
      const c0 = safeStr(row[0])
      const v1 = safeStr(row[1])
      if (sw(c0, 'complemento'))  { cur = 'complementos'; if (v1 && v1 !== '-') menu.complementos.push(v1); return }
      if (sw(c0, 'aperitivo'))    { cur = 'aperitivos';   if (v1 && v1 !== '-') menu.aperitivos.push(v1);   return }
      if (sw(c0, 'marisco'))      { cur = 'marisco';      if (v1 && v1 !== '-') menu.marisco.push(v1);       return }
      if (sw(c0, 'tapa'))         { cur = 'tapa';         if (v1 && v1 !== '-') menu.tapa.push(v1);          return }
      if (sw(c0, 'entrante'))     { cur = 'entrante';     if (v1 && v1 !== '-') menu.entrante = v1;           return }
      if (sw(c0, 'pescado'))      { cur = 'pescado';      if (v1 && v1 !== '-') menu.pescado = v1;            return }
      if (sw(c0, 'carne'))        { cur = 'carne';        if (v1 && v1 !== '-') menu.carne = v1;              return }
      if (sw(c0, 'postre'))       { cur = 'postre';       if (v1 && v1 !== '-') menu.postre = v1;             return }
      if (sw(c0, 'café') || sw(c0, 'cafe') || sw(c0, 'tarta')) { cur = null; return }
      if (!c0 && v1 && v1 !== '-') {
        if (cur === 'aperitivos') menu.aperitivos.push(v1)
        else if (cur === 'complementos') menu.complementos.push(v1)
        else if (cur === 'marisco') menu.marisco.push(v1)
        else if (cur === 'tapa') menu.tapa.push(v1)
        else if (cur && ['entrante', 'pescado', 'carne', 'postre'].includes(cur))
          menu[cur as 'entrante' | 'pescado' | 'carne' | 'postre'] =
            menu[cur as 'entrante' | 'pescado' | 'carne' | 'postre']
              ? menu[cur as 'entrante' | 'pescado' | 'carne' | 'postre'] + ' ' + v1
              : v1
      }
    })
  }

  // ── Menú infantil ──
  if (infantilStart >= 0) {
    const infEndKws = ['recena', 'bodega', 'menús especiales', 'menus especiales', 'barra', 'contrataci', 'protocolo']
    let infEnd = rows.length
    for (let j = infantilStart + 1; j < rows.length; j++) {
      const hj = safeStr(rows[j][0]).toLowerCase()
      if (infEndKws.some(kw => hj.includes(kw))) { infEnd = j; break }
    }
    let curInf: string | null = null
    rows.slice(infantilStart + 1, infEnd).forEach(row => {
      const c0 = safeStr(row[0])
      const v1 = safeStr(row[1])
      if (sw(c0, 'menú') || sw(c0, 'menu')) { curInf = 'menu';   if (v1 && v1 !== '-') menu.infantil.menu.push(v1); return }
      if (sw(c0, 'postre'))                  { curInf = 'postre'; if (v1 && v1 !== '-') menu.infantil.postre = v1;   return }
      if (sw(c0, 'nota'))                    { curInf = 'notas';  if (v1 && v1 !== '-') menu.infantil.notas = v1;    return }
      if (!c0 && v1 && v1 !== '-') {
        if (curInf === 'menu')   menu.infantil.menu.push(v1)
        else if (curInf === 'postre') menu.infantil.postre = (menu.infantil.postre + ' ' + v1).trim()
        else if (curInf === 'notas')  menu.infantil.notas  = (menu.infantil.notas  + ' ' + v1).trim()
      }
    })
  }

  // ── Recena ──
  if (recenaStart >= 0) {
    rows.slice(recenaStart + 1, Math.min(recenaStart + 15, rows.length)).forEach(row => {
      const v0 = safeStr(row[0])
      const v1 = safeStr(row[1])
      const item = (v0 && v0 !== '-') ? v0 : (v1 && v1 !== '-') ? v1 : ''
      if (item) menu.recena.push(item)
    })
  }

  // ── Bodega ──
  if (bodegaStart >= 0) {
    rows.slice(bodegaStart + 1, bodegaStart + 8).forEach(row => {
      const c0 = safeStr(row[0])
      const v1 = safeStr(row[1])
      if (sw(c0, 'vino blanco')) menu.bodega.blanco = v1
      else if (sw(c0, 'vino tinto')) menu.bodega.tinto = v1
      else if (sw(c0, 'cava')) menu.bodega.cava = v1
      else if (sw(c0, 'otras')) menu.bodega.otros = v1
    })
  }

  // ── Menús especiales ──
  if (specialStart >= 0) {
    const nameToKey: Record<string, string> = {
      'celiaco': 'celiacos', 'sin gluten': 'celiacos', 'vegetarian': 'vegetarianos',
      'infantil': 'infantil', 'sin marisco': 'sin_marisco', 'no marisco': 'sin_marisco',
      'sin pescado': 'sin_pescado', 'no pescado': 'sin_pescado',
      'sin carne': 'sin_carne', 'no carne': 'sin_carne',
      'sin lactosa': 'sin_lactosa', 'no lactosa': 'sin_lactosa',
      'alergico': 'alergicos', 'alergia': 'alergicos', 'alergicos': 'alergicos',
      'embarazada': 'embarazadas',
    }

    // Try to detect if this is a detailed table: NOMBRE | MESA | INTOLERANCIA | MODIFICACIONES
    const isDetailedTable = () => {
      // Look at headers in next few rows
      for (let i = specialStart + 1; i < Math.min(specialStart + 5, rows.length); i++) {
        const row = rows[i]
        const c0 = safeStr(row[0]).toLowerCase()
        const c1 = safeStr(row[1]).toLowerCase()
        const c2 = safeStr(row[2]).toLowerCase()
        if ((c0.includes('nombre') || c0.includes('mesa')) &&
            (c1.includes('mesa') || c1.includes('intoleran') || c1.includes('nombre')) &&
            (c2.includes('intoleran') || c2.includes('modifi'))) {
          return true
        }
      }
      return false
    }

    if (isDetailedTable()) {
      // Parse as detailed table
      rows.slice(specialStart + 1, specialStart + 60).forEach(row => {
        const c0 = safeStr(row[0])
        const c1 = safeStr(row[1])
        const c2 = safeStr(row[2])
        const c3 = safeStr(row[3])

        if (!c0 || c0.toLowerCase().includes('leyenda') || c0.toLowerCase().includes('bodega')) return

        // If we have nombre and intolerancia, treat as detailed row
        if (c0 && (c2 || c1)) {
          const item = {
            nombre: c0,
            mesa: c1,
            intolerancia: c2,
            modificaciones: c3 ? [c3] : undefined,
          }
          special_menus_detailed.push(item)

          // Also count in summary
          const intolLower = c2.toLowerCase()
          Object.entries(nameToKey).forEach(([key, mapKey]) => {
            if (intolLower.includes(key)) special_menus[mapKey]++
          })
        }
      })
    } else {
      // Parse as summary only
      rows.slice(specialStart + 1, specialStart + 60).forEach(row => {
        const c0l = safeStr(row[0]).toLowerCase()
        if (c0l.includes('leyenda') || c0l.includes('bodega')) return
        const intol = safeStr(row[2]).toLowerCase()
        const allText = c0l + ' ' + intol
        Object.entries(nameToKey).forEach(([key, mapKey]) => {
          if (allText.includes(key)) special_menus[mapKey]++
        })
      })
    }
  }

  // Add special_menus_detailed to menu object
  const menuWithSpecial = {
    ...menu,
    special_menus,
    special_menus_detailed,
  }

  return { menu: menuWithSpecial, special_menus, special_menus_detailed }
}

// ─── PARSE BARRA + CONTRATACIONES ─────────────────────────────────────────────

function parseBarraContrat(rows: Row[]) {
  const barra = { inicio_barra: '', cierre_barra: '', dj: '', otros: '' }
  const contrat: Record<string, string> = {
    fotografo: '', fotografo_tel: '',
    video: '', video_tel: '',
    animacion: '', estilistas: '', estilistas_tel: '',
    autobuses: '', bandas: '', otros: '',
  }

  const barraStart = findSection(rows, 'barra libre')
  if (barraStart >= 0) {
    rows.slice(barraStart + 1, barraStart + 10).forEach(row => {
      const c0 = safeStr(row[0])
      const v1 = safeStr(row[1])
      if (sw(c0, 'barra')) {
        const mi = v1.match(/inicio[:\s]+([^\t,]+)/i)
        const mc = v1.match(/cierre[:\s]+(.+)/i)
        if (mi) barra.inicio_barra = mi[1].trim()
        if (mc) barra.cierre_barra = mc[1].trim()
      } else if (sw(c0, 'dj')) {
        barra.dj = v1
      } else if (sw(c0, 'otros') || sw(c0, 'baile')) {
        barra.otros = barra.otros ? barra.otros + ' | ' + v1 : v1
      }
    })
  }

  const contStart = findSection(rows, 'contrataciones externas')
  if (contStart >= 0) {
    let lastType = ''
    rows.slice(contStart + 1, contStart + 20).forEach(row => {
      const c0 = safeStr(row[0])
      const v1 = safeStr(row[1])
      const c0l = c0.toLowerCase()

      if (sw(c0, 'fotó') || sw(c0, 'foto')) {
        contrat.fotografo = v1
        lastType = 'fotografo'
      } else if (c0l.includes('fotografo') && c0l.includes('tel')) {
        contrat.fotografo_tel = v1
      } else if (sw(c0, 'video') || sw(c0, 'vídeo')) {
        contrat.video = v1
        lastType = 'video'
      } else if (c0l.includes('video') && c0l.includes('tel')) {
        contrat.video_tel = v1
      } else if (sw(c0, 'animaci')) {
        contrat.animacion = v1
      } else if (sw(c0, 'estilista')) {
        contrat.estilistas = v1
        lastType = 'estilistas'
      } else if (c0l.includes('estilista') && c0l.includes('tel')) {
        contrat.estilistas_tel = v1
      } else if (sw(c0, 'autobus') || sw(c0, 'autobús')) {
        contrat.autobuses = v1
      } else if (sw(c0, 'banda')) {
        contrat.bandas = v1
      } else if (sw(c0, 'otros')) {
        contrat.otros = v1
      }
    })
  }

  return { barra_libre_musica: barra, contrataciones_externas: contrat }
}

// ─── PARSE FECHAS + CLIENTES ──────────────────────────────────────────────────

function parseFechasCliente(rows: Row[]) {
  const fechas = { confirmacion_invitados: '', ingreso_inicial: '', ingreso_restante: '' }
  const cliente = { nombres: '', telefonos: '', mails: '', direccion: '' }

  const fStart = findSection(rows, 'fechas importantes')
  if (fStart >= 0) {
    rows.slice(fStart + 1, fStart + 8).forEach(row => {
      const c0l = safeStr(row[0]).toLowerCase()
      const val = parseSpanishDate(row[1]) || safeStr(row[1]) || parseSpanishDate(row[4]) || safeStr(row[4])
      if (c0l.includes('confirmac') || c0l.includes('invitados')) fechas.confirmacion_invitados = val
      else if (c0l.includes('inicial') || c0l.includes('primer')) fechas.ingreso_inicial = val
      else if (c0l.includes('restante') || c0l.includes('segundo')) fechas.ingreso_restante = val
    })
  }

  let cStart = -1
  for (let i = (fStart >= 0 ? fStart : 0); i < rows.length; i++) {
    const h = safeStr(rows[i][0]).toLowerCase()
    if (h.includes('cliente') && !h.includes('fecha')) { cStart = i; break }
  }
  if (cStart >= 0) {
    rows.slice(cStart + 1, cStart + 12).forEach(row => {
      const c0l = safeStr(row[0]).toLowerCase()
      const v1 = safeStr(row[1])
      if (c0l.includes('nombre') || c0l.includes('cliente')) cliente.nombres = v1
      else if (c0l.includes('telef') || c0l.includes('móvil') || c0l.includes('movil') || c0l.includes('teléfono')) {
        cliente.telefonos = cliente.telefonos ? cliente.telefonos + ' | ' + v1 : v1
      } else if (c0l.includes('mail') || c0l.includes('email')) {
        cliente.mails = cliente.mails ? cliente.mails + ' ' + v1 : v1
      } else if (c0l.includes('direcci') || c0l.includes('dirección')) {
        cliente.direccion = v1
      }
    })
  }

  return { fechas_importantes: fechas, cliente_info: cliente }
}

// ─── PARSE MONTAJES ───────────────────────────────────────────────────────────

function parseMontajes(rows: Row[]): {
  minutas_modelo?: string
  nombre_minuta?: string
  banquete_color?: string
  banquete_vaso?: string
  banquete_flores?: string
  decoraciones_generales: string
  protocolo_autobuses?: string
  regalos?: string
} {
  const r: {
    minutas_modelo?: string
    nombre_minuta?: string
    banquete_color?: string
    banquete_vaso?: string
    banquete_flores?: string
    decoraciones_generales: string
    protocolo_autobuses?: string
    regalos?: string
  } = {
    decoraciones_generales: '',
  }
  let idx = findSection(rows, 'ubicación y montajes')
  if (idx < 0) idx = findSection(rows, 'ubicacion y montajes')
  if (idx < 0) return r

  rows.slice(idx + 1, idx + 30).forEach(row => {
    const c0l = safeStr(row[0]).toLowerCase()
    const v1 = safeStr(row[1])

    if (c0l.includes('minuta') && (c0l.includes('modelo') || c0l.includes('seating'))) {
      r.minutas_modelo = v1
    } else if (c0l.includes('nombre') && c0l.includes('minuta')) {
      r.nombre_minuta = v1
    } else if (c0l.includes('banquete') && c0l.includes('color')) {
      r.banquete_color = v1
    } else if (c0l.includes('vaso') || (c0l.includes('banquete') && c0l.includes('vaso'))) {
      r.banquete_vaso = v1
    } else if (c0l.includes('flores') || (c0l.includes('banquete') && c0l.includes('flores'))) {
      r.banquete_flores = v1
    } else if (c0l.includes('decorac') || c0l.includes('adorno')) {
      r.decoraciones_generales = r.decoraciones_generales ? r.decoraciones_generales + ' | ' + v1 : v1
    } else if (c0l.includes('protocolo') && c0l.includes('autobus')) {
      r.protocolo_autobuses = v1
    } else if (c0l.includes('regalo') || c0l.includes('regalos')) {
      r.regalos = v1
    }
  })

  return r
}

// ─── PARSE CUENTAS ────────────────────────────────────────────────────────────

function parseCuentas(rows: Row[]) {
  const r: Record<string, unknown> = {
    precio_adulto: 0,
    precio_nino: 0,
    precio_profesional: 0,
    extras: [],
  }
  const idx = findSection(rows, 'cuentas')
  if (idx < 0) return r

  rows.slice(idx + 1, idx + 25).forEach(row => {
    const c0l = safeStr(row[0]).toLowerCase()
    const v1 = safeStr(row[1])

    if (c0l.includes('precio') && c0l.includes('adulto')) {
      r.precio_adulto = safeNum(row[1])
    } else if (c0l.includes('precio') && c0l.includes('niño')) {
      r.precio_nino = safeNum(row[1])
    } else if (c0l.includes('precio') && c0l.includes('profesional')) {
      r.precio_profesional = safeNum(row[1])
    } else if (c0l.includes('extra')) {
      const extra = {
        concepto: v1,
        precio_unitario: safeNum(row[2]) || 0,
        unidades_previstas: safeNum(row[3]) || 0,
        total_previsto: safeNum(row[4]) || 0,
      }
      ;(r.extras as Array<Record<string, unknown>>).push(extra)
    }
  })

  return r
}

// ─── MAIN PROCESSOR ───────────────────────────────────────────────────────────

function processSheetRows(rows: Row[], sheetName: string, fileSource: string): SheetWeddingRaw | null {
  if (!rows.length) return null
  const basic = parseBasicInfo(rows, sheetName, fileSource)
  const menuResult = parseMenu(rows)
  const barraContrat = parseBarraContrat(rows)
  const fechasCliente = parseFechasCliente(rows)
  const montajes = parseMontajes(rows)
  const cuentas = parseCuentas(rows)

  return {
    couples_name: basic.couples_name,
    clients: basic.clients,
    date: basic.date,
    coordinator: basic.coordinator,
    adults: basic.adults,
    children: basic.children,
    professionals: basic.professionals,
    ceremony_type: basic.ceremony_type,
    ceremony_time: basic.ceremony_time,
    ceremony_place: basic.ceremony_place,
    service_type: basic.service_type,
    start_time: basic.start_time,
    end_time: basic.end_time,
    file_source: basic.file_source,
    menu: menuResult.menu as SheetWeddingRaw['menu'],
    special_menus: menuResult.special_menus,
    special_menus_detailed: menuResult.special_menus_detailed || [],
    barra_libre_musica: barraContrat.barra_libre_musica,
    contrataciones_externas: barraContrat.contrataciones_externas,
    fechas_importantes: fechasCliente.fechas_importantes,
    cliente_info: fechasCliente.cliente_info,
    ubicacion_montajes: montajes,
    cuentas_detalle: cuentas,
    protocols: {},
    notes: [],
  }
}

// ─── FETCH FROM GOOGLE SHEET ──────────────────────────────────────────────────

export async function fetchFromGoogleSheet(config: SheetCoordConfig): Promise<{
  coordinadora: string; ok: boolean; weddings: SheetWeddingRaw[]; error?: string
}> {
  const url = config.sheetUrl?.trim()
  if (!url) {
    return { coordinadora: config.coordinadora, ok: false, weddings: [], error: 'URL no configurada' }
  }

  if (!isValidSheetUrl(url)) {
    return { coordinadora: config.coordinadora, ok: false, weddings: [], error: 'Pega el enlace de Google Sheets (docs.google.com/spreadsheets/...)' }
  }

  const spreadsheetId = extractSpreadsheetId(url)
  if (!spreadsheetId) {
    return { coordinadora: config.coordinadora, ok: false, weddings: [], error: 'No se pudo extraer el ID de la hoja' }
  }

  if (!SHEETS_API_KEY) {
    return {
      coordinadora: config.coordinadora, ok: false, weddings: [],
      error: 'VITE_GOOGLE_SHEETS_API_KEY no configurada en .env.local',
    }
  }

  try {
    // 1. Obtener lista de pestañas
    const metaRes = await fetch(
      `${SHEETS_API_BASE}/${spreadsheetId}?key=${SHEETS_API_KEY}&fields=sheets.properties(title,sheetId)`
    )
    if (!metaRes.ok) {
      if (metaRes.status === 403) throw new Error('Acceso denegado. ¿Está la hoja configurada como "pública para ver"?')
      if (metaRes.status === 404) throw new Error('Hoja no encontrada. Verifica el enlace')
      throw new Error(`HTTP ${metaRes.status}`)
    }
    const meta = await metaRes.json() as { sheets: Array<{ properties: { title: string } }> }
    const allTabs = (meta.sheets || []).map(s => s.properties.title)

    // 2. Filtrar pestañas de resumen
    const weddingTabs = allTabs.filter(name => {
      const nl = name.toLowerCase()
      return !SKIP_SHEETS_KW.some(kw => nl.includes(kw))
    })

    // 3. Leer y parsear cada pestaña (con throttle 2s para 30 req/min << 60 req/min límite)
    const weddings: SheetWeddingRaw[] = []
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

    for (const tabName of weddingTabs) {
      let retries = 2
      while (retries > 0) {
        try {
          const encodedName = encodeURIComponent(tabName)
          const dataRes = await fetch(
            `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodedName}!A1:Z320?key=${SHEETS_API_KEY}`
          )
          if (dataRes.status === 429) {
            // Rate limit → esperar 3s y reintentar
            await delay(3000)
            retries--
            continue
          }
          if (!dataRes.ok) break
          const data = await dataRes.json() as { values?: unknown[][] }
          const rows: Row[] = (data.values || []) as Row[]
          const wedding = processSheetRows(rows, tabName, config.coordinadora)
          if (wedding) weddings.push(wedding)
          break
        } catch {
          break
        }
      }
      // Pausa de 2s entre pestañas (máx 30 req/min, seguro vs 60 req/min límite)
      await delay(2000)
    }

    return { coordinadora: config.coordinadora, ok: true, weddings }
  } catch (err) {
    return {
      coordinadora: config.coordinadora, ok: false, weddings: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── API KEY CHECK ────────────────────────────────────────────────────────────

export function hasApiKey(): boolean {
  return !!(SHEETS_API_KEY && SHEETS_API_KEY.length > 10)
}
