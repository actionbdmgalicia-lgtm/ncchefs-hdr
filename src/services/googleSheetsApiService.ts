// ╔══════════════════════════════════════════════════════════════════════╗
// ║  NCCHEFS – Google Sheets API Service  v3                            ║
// ║  Parser basado en estructura REAL de HDR (analizada 16/04/2026)     ║
// ║                                                                      ║
// ║  Estructura de columnas real (0-indexed):                           ║
// ║  A=row[0]  B=row[1]  C=row[2]  D=row[3]  E=row[4]  F=row[5]       ║
// ╚══════════════════════════════════════════════════════════════════════╝

import type { SheetCoordConfig, SheetWeddingRaw } from '../types'

const SHEETS_API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY as string | undefined
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const SKIP_SHEETS_KW = ['ficheros', 'plantilla', 'tabla', 'consolidado', 'resumen', 'fichero']

// ─── URL UTILS ────────────────────────────────────────────────────────────────

export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

export function isValidSheetUrl(url: string): boolean {
  return url.includes('docs.google.com/spreadsheets')
}

export function hasApiKey(): boolean {
  return !!(SHEETS_API_KEY && SHEETS_API_KEY.length > 10)
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

type CellValue = string | number | boolean | null | undefined
type Row = CellValue[]

function s(val: CellValue): string {
  if (val === null || val === undefined || val === '') return ''
  if (typeof val === 'string') {
    return val.replace(/[\u200b\u202c\u202a\ufeff]/g, '').trim()
  }
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? '' : String(val)
  return String(val).trim()
}

function sl(val: CellValue): string { return s(val).toLowerCase() }

function n(val: CellValue): number {
  const str = s(val).replace(/[€\s.]/g, '').replace(',', '.')
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

// ─── DATE PARSING: formato español DD/MM/YYYY → ISO YYYY-MM-DD ───────────────

export function parseSpanishDate(val: CellValue): string {
  const raw = s(val)
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw  // ya es ISO
  const m = raw.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})$/)
  if (m) {
    const day = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    const year = m[3].length === 2 ? '20' + m[3] : m[3]
    if (parseInt(day) >= 1 && parseInt(day) <= 31 && parseInt(month) >= 1 && parseInt(month) <= 12)
      return `${year}-${month}-${day}`
  }
  return raw
}

// Extrae HH:MM de strings como "19:30-19:45 :00" o "03:30-04:00"
function extractTime(str: string): string {
  const m = str.match(/(\d{1,2}:\d{2})/)
  return m ? m[1] : ''
}

// ─── SECTION INDEX MAP ────────────────────────────────────────────────────────

function buildSectionMap(rows: Row[]): Record<string, number> {
  const map: Record<string, number> = {}
  rows.forEach((row, i) => {
    const a = sl(row[0])
    if (!a) return
    if (a.includes('menú cocina') || a.includes('menu cocina')) map['menu'] = i
    else if (a.includes('menú infantil') || a.includes('menu infantil')) map['infantil'] = i
    else if (a === 'recena') map['recena'] = i
    else if (a === 'bodega') map['bodega'] = i
    else if (a.includes('menús especiales') || a.includes('menus especiales')) map['especiales'] = i
    else if (a.includes('barra libre')) map['barra'] = i
    else if (a.includes('ubicación y montajes') || a.includes('ubicacion y montajes')) map['montajes'] = i
    else if (a === 'protocolos') map['protocolos'] = i
    else if (a.includes('contrataciones externas')) map['contrat'] = i
    else if (a.includes('fechas importantes')) map['fechas'] = i
    else if (a.includes('clientes')) map['clientes'] = i
    else if (a === 'cuentas') map['cuentas'] = i
  })
  return map
}

// ─── PARSE BASIC INFO ─────────────────────────────────────────────────────────
// Estructura real (filas 1-7):
// R002: [Cliente:, nombre]
// R003: [Fecha:, DD/MM/YYYY, , Hora inicio servicio:, HH:MM]
// R004: [Coordinador:, nombre, , Hora cierre:, HH:MM]
// R005: [, , , Tipo de servicio:, valor]
// R006: [Adultos:, N, Niños:, N, Profesionales:, N]
// R007: [Tipo ceremonia: X, , Hora: HH:MM, Lugar:, lugar]

function parseBasicInfo(rows: Row[], sheetName: string, fileSource: string) {
  const info = {
    couples_name: sheetName.trim(),
    clients: '', date: '', coordinator: '',
    adults: 0, children: 0, professionals: 0,
    service_type: '', ceremony_type: '', ceremony_time: '', ceremony_place: '',
    start_time: '', end_time: '',
    file_source: fileSource,
  }

  // Solo miramos las primeras 12 filas para info básica
  for (const row of rows.slice(0, 12)) {
    const a = sl(row[0])
    const b = s(row[1])

    if (a.startsWith('cliente')) {
      info.clients = b || s(row[0]).replace(/^cliente[s]?\s*:\s*/i, '').trim()
    }
    if (a.startsWith('fecha') && row[1]) {
      info.date = parseSpanishDate(row[1])
    }
    if ((a.startsWith('coordinad')) && b) {
      info.coordinator = b
    }
    // Hora inicio servicio en col D (idx 3), valor en col E (idx 4)
    if (s(row[3]).toLowerCase().includes('hora inicio') && row[4]) {
      info.start_time = extractTime(s(row[4]))
    }
    // Hora cierre en col D (idx 3), valor en col E (idx 4)
    if (s(row[3]).toLowerCase().includes('hora cierre') && row[4]) {
      info.end_time = extractTime(s(row[4]))
    }
    // Tipo de servicio en col D (idx 3), valor en col E (idx 4)
    if (s(row[3]).toLowerCase().includes('tipo de servicio') && row[4]) {
      info.service_type = s(row[4])
    }
    // Adultos en A→B, Niños en C→D, Profesionales en E→F
    if (a.startsWith('adultos')) {
      info.adults = parseInt(b) || 0
      if (row[2] && sl(row[2]).includes('niño')) info.children = parseInt(s(row[3])) || 0
      if (row[4] && sl(row[4]).includes('profesional')) info.professionals = parseInt(s(row[5])) || 0
    }
    // Tipo ceremonia: en col A combinado "Tipo ceremonia: religiosa"
    if (a.startsWith('tipo ceremonia')) {
      info.ceremony_type = s(row[0]).replace(/^tipo\s+ceremonia\s*:\s*/i, '').trim()
    }
    // Hora ceremonia en col C combinado "Hora: 18:00"
    if (row[2] && sl(row[2]).startsWith('hora:')) {
      info.ceremony_time = extractTime(s(row[2]))
    }
    // Lugar ceremonia en col D → col E
    if (s(row[3]).toLowerCase().includes('lugar') && row[4]) {
      info.ceremony_place = s(row[4])
    }
  }

  return info
}

// ─── PARSE MENU ───────────────────────────────────────────────────────────────
// Estructura real: col A = categoría, col B = ítem
// RECENA: ítems en col A directamente (no col B)

function parseMenu(rows: Row[], sec: Record<string, number>) {
  const menu = {
    aperitivos: [] as string[], complementos: [] as string[],
    marisco: [] as string[], tapa: [] as string[],
    entrante: '', pescado: '', carne: '', postre: '',
    infantil: { menu: [] as string[], postre: '', notas: '' },
    recena: [] as string[],
    bodega: { blanco: '', tinto: '', cava: '', otros: '' },
  }

  // ── Menú principal ──
  if (sec['menu'] !== undefined) {
    const end = Math.min(
      ...[sec['infantil'], sec['recena'], sec['bodega'], sec['especiales'], sec['barra']]
        .filter(i => i !== undefined && i > sec['menu']) as number[]
    , rows.length)

    let cur: keyof typeof menu | null = null
    rows.slice(sec['menu'] + 1, end).forEach(row => {
      const a = sl(row[0])
      const b = s(row[1])
      if (!a && !b) return

      if (a.startsWith('complemento')) { cur = 'complementos'; if (b && b !== '-') menu.complementos.push(b); return }
      if (a.startsWith('aperitivo'))   { cur = 'aperitivos';   if (b && b !== '-') menu.aperitivos.push(b);   return }
      if (a.startsWith('marisco'))     { cur = 'marisco';      if (b && b !== '-') menu.marisco.push(b);       return }
      if (a.startsWith('tapa'))        { cur = 'tapa';         if (b && b !== '-') menu.tapa.push(b);          return }
      if (a.startsWith('entrante'))    { cur = 'entrante';     if (b && b !== '-') menu.entrante = b;           return }
      if (a.startsWith('pescado'))     { cur = 'pescado';      if (b && b !== '-') menu.pescado = b;            return }
      if (a.startsWith('carne'))       { cur = 'carne';        if (b && b !== '-') menu.carne = b;              return }
      if (a.startsWith('postre'))      { cur = 'postre';       if (b && b !== '-') menu.postre = b;             return }
      // Continuar ítem en misma categoría (col A vacía, col B tiene valor)
      if (!a && b && b !== '-' && cur) {
        if (cur === 'aperitivos' || cur === 'complementos' || cur === 'marisco' || cur === 'tapa') {
          (menu[cur] as string[]).push(b)
        } else if (cur === 'entrante' || cur === 'pescado' || cur === 'carne' || cur === 'postre') {
          if (menu[cur]) menu[cur] = (menu[cur] as string) + ' | ' + b
          else (menu as unknown as Record<string, string>)[cur as string] = b
        }
      }
    })
  }

  // ── Menú infantil ──
  if (sec['infantil'] !== undefined) {
    const end = Math.min(
      ...[sec['recena'], sec['bodega'], sec['especiales']]
        .filter(i => i !== undefined && i > sec['infantil']) as number[]
    , rows.length)

    rows.slice(sec['infantil'] + 1, end).forEach(row => {
      const a = sl(row[0])
      const b = s(row[1])
      if (a.startsWith('menú') || a.startsWith('menu')) { if (b && b !== '-') menu.infantil.menu.push(b) }
      else if (a.startsWith('postre')) { if (b) menu.infantil.postre = b }
      else if (a.startsWith('nota')) { if (b) menu.infantil.notas = b }
      else if (!a && b && b !== '-') { menu.infantil.menu.push(b) }
    })
  }

  // ── Recena: ítems en col A directamente ──
  if (sec['recena'] !== undefined) {
    const end = Math.min(
      ...[sec['bodega'], sec['especiales'], sec['barra']]
        .filter(i => i !== undefined && i > sec['recena']) as number[]
    , rows.length)

    rows.slice(sec['recena'] + 1, end).forEach(row => {
      const a = s(row[0])
      if (a && a !== '-') menu.recena.push(a)
    })
  }

  // ── Bodega ──
  if (sec['bodega'] !== undefined) {
    rows.slice(sec['bodega'] + 1, sec['bodega'] + 8).forEach(row => {
      const a = sl(row[0])
      const b = s(row[1])
      if (a.includes('blanco')) menu.bodega.blanco = b
      else if (a.includes('tinto')) menu.bodega.tinto = b
      else if (a.includes('cava')) menu.bodega.cava = b
      else if (a.includes('otras') || a.includes('otros')) menu.bodega.otros = b
    })
  }

  return menu
}

// ─── PARSE MENÚS ESPECIALES ───────────────────────────────────────────────────
// Estructura real:
// R066: [MENÚS ESPECIALES]
// R067: [NOMBRE, MESA, INTOLERANCIA]  ← header
// R068+: [nombre, mesa, intolerancia, ...]
// Termina en fila "Leyenda" o vacías consecutivas

function parseSpecialMenus(rows: Row[], sec: Record<string, number>) {
  const summary: Record<string, number> = {
    celiacos: 0, vegetarianos: 0, sin_marisco: 0, sin_pescado: 0,
    sin_carne: 0, sin_lactosa: 0, alergicos: 0, embarazadas: 0,
  }
  const detailed: Array<{ nombre: string; mesa: string; intolerancia: string; modificaciones?: string[] }> = []

  if (sec['especiales'] === undefined) return { special_menus: summary, special_menus_detailed: detailed }

  const startIdx = sec['especiales'] + 1
  // Buscar la fila header NOMBRE/MESA/INTOLERANCIA
  let dataStart = startIdx
  for (let i = startIdx; i < Math.min(startIdx + 3, rows.length); i++) {
    if (sl(rows[i][0]).includes('nombre') || sl(rows[i][1]).includes('mesa')) {
      dataStart = i + 1  // datos empiezan DESPUÉS del header
      break
    }
  }

  const keyMap: Record<string, string> = {
    'celiaco': 'celiacos', 'sin gluten': 'celiacos', 'gluten': 'celiacos',
    'vegetarian': 'vegetarianos', 'vegano': 'vegetarianos',
    'sin marisco': 'sin_marisco', 'no marisco': 'sin_marisco', 'marisco': 'sin_marisco',
    'sin pescado': 'sin_pescado', 'no pescado': 'sin_pescado',
    'sin carne': 'sin_carne', 'sin lactosa': 'sin_lactosa', 'no lactosa': 'sin_lactosa',
    'alergi': 'alergicos', 'intolerante': 'alergicos',
    'embarazada': 'embarazadas',
  }

  let emptyCount = 0
  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i]
    const nombre = s(row[0])
    const mesa   = s(row[1])
    const intol  = s(row[2])

    if (!nombre && !mesa && !intol) { emptyCount++; if (emptyCount > 2) break; continue }
    emptyCount = 0

    if (sl(row[0]).includes('leyenda') || sl(row[0]).includes('bodega')) break

    // Saltar si es claramente un header de otra sección
    if (sl(row[0]) === 'bodega' || sl(row[0]).includes('barra libre')) break

    if (nombre) {
      const item = {
        nombre,
        mesa,
        intolerancia: intol,
        modificaciones: row[4] ? [s(row[4])] : undefined,
      }
      detailed.push(item)

      // Contar tipo de intolerancia
      const intolLower = intol.toLowerCase()
      for (const [kw, key] of Object.entries(keyMap)) {
        if (intolLower.includes(kw)) { summary[key]++; break }
      }
    }
  }

  return { special_menus: summary, special_menus_detailed: detailed }
}

// ─── PARSE BARRA LIBRE Y MÚSICA ───────────────────────────────────────────────
// Estructura real:
// [Barra libre, "Inicio: 11:30 -12:00", , Cierre:, "4 basicas"]
// [, , , , ¿valorais ampliar?]
// [Dj, tocata, , "cierre : 03:30 -04:00"]  ← cierre real
// [Otros, manu diaz]

function parseBarraLibre(rows: Row[], sec: Record<string, number>) {
  const barra = { inicio_barra: '', cierre_barra: '', dj: '', otros: '' }

  if (sec['barra'] === undefined) return barra

  rows.slice(sec['barra'] + 1, sec['barra'] + 15).forEach(row => {
    const a = sl(row[0])
    const b = s(row[1])

    if (a.startsWith('barra')) {
      // "Inicio: HH:MM" está en col B
      barra.inicio_barra = extractTime(b)
    } else if (a.startsWith('dj')) {
      barra.dj = b
      // El cierre real del DJ/barra puede estar en col D "cierre : 03:30-04:00"
      const d = s(row[3])
      if (d.toLowerCase().includes('cierre')) barra.cierre_barra = extractTime(d)
    } else if (a.startsWith('otros') || a.startsWith('baile')) {
      barra.otros = barra.otros ? barra.otros + ' | ' + b : b
    }
  })

  return barra
}

// ─── PARSE CONTRATACIONES EXTERNAS ───────────────────────────────────────────
// Estructura real: col A=categoria, col B=nombre, col F(idx 5)=teléfono
// Caso especial: MUNDOROSSA tiene col A vacía, col B=nombre, col F=tel

function parseContrataciones(rows: Row[], sec: Record<string, number>) {
  const c: Record<string, string> = {
    fotografo: '', fotografo_tel: '',
    video: '', video_tel: '',
    animacion: '', animacion_tel: '',
    autobuses: '', autobuses_tel: '',
    bandas: '', bandas_tel: '',
    estilistas: '', estilistas_tel: '',
    otros: '', otros_tel: '',
  }

  if (sec['contrat'] === undefined) return c

  rows.slice(sec['contrat'] + 1, sec['contrat'] + 20).forEach(row => {
    const a = sl(row[0])
    const nombre = s(row[1])
    const tel    = s(row[5])  // teléfono SIEMPRE en col F (idx 5)

    if (a.startsWith('fotó') || a.startsWith('foto')) {
      c.fotografo = nombre; c.fotografo_tel = tel
    } else if (a.startsWith('video') || a.startsWith('vídeo')) {
      c.video = nombre; c.video_tel = tel
    } else if (a.startsWith('animaci')) {
      c.animacion = nombre; c.animacion_tel = tel
    } else if (a.startsWith('autobus') || a.startsWith('autobús')) {
      c.autobuses = nombre; c.autobuses_tel = tel
    } else if (a.startsWith('banda')) {
      c.bandas = nombre; c.bandas_tel = tel
    } else if (a.startsWith('otros')) {
      c.otros = nombre; c.otros_tel = tel
    } else if (!a && nombre) {
      // Caso MUNDOROSSA: col A vacía, continuación de "Otros" o estilistas
      // Detectar si es estilista por el nombre
      const nameLower = nombre.toLowerCase()
      if (nameLower.includes('estilista') || nameLower.includes('peluq') || nameLower.includes('maquillaj')) {
        c.estilistas = nombre
        c.estilistas_tel = tel || s(row[4])  // tel puede estar en col E o F
      } else {
        // Añadir a "otros" como segundo proveedor
        if (c.otros) {
          c.otros += ' | ' + nombre
          if (tel) c.otros_tel += ' | ' + tel
        } else {
          c.otros = nombre; c.otros_tel = tel
        }
      }
    }
  })

  // Detectar MUNDOROSSA específicamente (nombre contiene "MUNDOROSSA")
  // Re-scan para asegurarse
  rows.slice(sec['contrat'] + 1, sec['contrat'] + 20).forEach(row => {
    const nombre = s(row[1])
    const tel    = s(row[5]) || s(row[4])
    if (nombre.toUpperCase().includes('MUNDOROSSA')) {
      c.estilistas = nombre
      c.estilistas_tel = tel
    }
  })

  return c
}

// ─── PARSE FECHAS IMPORTANTES ─────────────────────────────────────────────────
// Estructura real: fecha en col E (idx 4), NO en col B
// [Último día de confirmación..., , , , 15/04/2026]
// [Fecha ingreso inicial:, , , , 10/04/2026]
// [Fecha ingreso restante:, , , , 24/04/2026]

function parseFechas(rows: Row[], sec: Record<string, number>) {
  const f = { confirmacion_invitados: '', ingreso_inicial: '', ingreso_restante: '' }
  if (sec['fechas'] === undefined) return f

  rows.slice(sec['fechas'] + 1, sec['fechas'] + 8).forEach(row => {
    const a = sl(row[0])
    // Fecha está en col E (idx 4)
    const fecha = parseSpanishDate(row[4]) || parseSpanishDate(row[1])

    if (a.includes('confirmac') || a.includes('invitados')) f.confirmacion_invitados = fecha
    else if (a.includes('inicial') || a.includes('primer')) f.ingreso_inicial = fecha
    else if (a.includes('restante') || a.includes('segundo')) f.ingreso_restante = fecha
  })

  return f
}

// ─── PARSE CLIENTES ───────────────────────────────────────────────────────────

function parseClientes(rows: Row[], sec: Record<string, number>) {
  const c = { nombres: '', telefonos: '', mails: '', direccion: '' }
  if (sec['clientes'] === undefined) return c

  rows.slice(sec['clientes'] + 1, sec['clientes'] + 8).forEach(row => {
    const a = sl(row[0])
    const b = s(row[1])
    if (a.startsWith('cliente') || a.startsWith('nombre')) c.nombres = b
    else if (a.startsWith('telef') || a.startsWith('móvil') || a.startsWith('movil')) c.telefonos = b
    else if (a.startsWith('mail') || a.startsWith('email')) c.mails = b
    else if (a.startsWith('direcci')) c.direccion = b
  })

  return c
}

// ─── PARSE UBICACIÓN Y MONTAJES ───────────────────────────────────────────────
// Estructura real:
// [Minutas, Modelo:, Eucalipto, , Color:]         → minutas_modelo = col C
// [, Nombre en minuta: Laura y Jacobo]            → extraer del col B
// [Banquete, Mantelería:, Verde y servi raya, ...]→ banquete_color = col C
// [, Vaso:, azul/verdoso, , Flores:Neboda]        → vaso=col C, flores en col E
// [Decoraciones]                                   → header
// [Galletitas a sus invitados]                     → decoración en col A (sin label)
// PROTOCOLOS:
// [Autobuses:, , Salidas 2 y cierre 4 00...]      → protocolo_autobuses en col C
// [Regalos:, Galletitas a sus invitados]           → regalos en col B

function parseMontajesYProtocolos(rows: Row[], sec: Record<string, number>) {
  const m: {
    minutas_modelo?: string; nombre_minuta?: string; banquete_color?: string
    banquete_vaso?: string; banquete_flores?: string; decoraciones_generales: string
    protocolo_autobuses?: string; regalos?: string
  } = {
    minutas_modelo: '', nombre_minuta: '', banquete_color: '',
    banquete_vaso: '', banquete_flores: '', decoraciones_generales: '',
    protocolo_autobuses: '', regalos: '',
  }

  // ── Ubicación y Montajes ──
  if (sec['montajes'] !== undefined) {
    const end = sec['protocolos'] ?? sec['contrat'] ?? (sec['montajes'] + 40)
    let inDecoraciones = false

    rows.slice(sec['montajes'] + 1, end).forEach(row => {
      const a  = sl(row[0])
      const b  = s(row[1])
      const c  = s(row[2])
      const e  = s(row[4])

      if (a.startsWith('minutas') || a.startsWith('minuta')) {
        // [Minutas, Modelo:, Eucalipto]
        m.minutas_modelo = c || b.replace(/modelo\s*:\s*/i, '').trim()
        inDecoraciones = false
      } else if (!a && b.toLowerCase().includes('nombre en minuta')) {
        // [, Nombre en minuta: Laura y Jacobo]
        m.nombre_minuta = b.replace(/nombre en minuta\s*:\s*/i, '').trim()
      } else if (a.startsWith('banquete')) {
        // [Banquete, Mantelería:, Verde y servi raya]
        m.banquete_color = c
        inDecoraciones = false
      } else if (!a && b.toLowerCase().startsWith('vaso')) {
        // [, Vaso:, azul/verdoso, , Flores:Neboda]
        m.banquete_vaso = c
        // Flores en col E combinado "Flores:Neboda"
        if (e.toLowerCase().includes('flores')) {
          m.banquete_flores = e.replace(/flores\s*:\s*/i, '').trim()
        }
      } else if (a === 'decoraciones' || a.startsWith('decoraci')) {
        inDecoraciones = true
      } else if (inDecoraciones && s(row[0]) && !sl(row[0]).startsWith('aperitivo') && !sl(row[0]).startsWith('banquete')) {
        // Líneas de decoración en col A
        const deco = s(row[0])
        if (deco) m.decoraciones_generales = m.decoraciones_generales
          ? m.decoraciones_generales + ' | ' + deco
          : deco
      }
    })
  }

  // ── Protocolos ──
  if (sec['protocolos'] !== undefined) {
    rows.slice(sec['protocolos'] + 1, sec['protocolos'] + 20).forEach(row => {
      const a = sl(row[0])
      const b = s(row[1])
      const c = s(row[2])

      if (a.startsWith('autobus')) {
        // [Autobuses:, , Salidas 2 y cierre 4 00]  → valor en col C
        m.protocolo_autobuses = c || b
      } else if (a.startsWith('regalo')) {
        // [Regalos:, Galletitas a sus invitados]
        m.regalos = b
      }
    })
  }

  return m
}

// ─── PARSE CUENTAS ────────────────────────────────────────────────────────────
// Estructura real (desde R163):
// [CUENTAS]
// [, , , , Precio menú incluidas opciones, 146,50 €]   → precio total en col F
// [Invitados, Adultos:, 73, , Precio base menú, 109,00€]
// [, Niños, 6, , Precio menú infantil, 50,00€]
// [, Profesionales, 4, , Precio menú profesionales, 50,00€]
// [, , Costes unit., Unidades, Coste total]             → header tabla extras
// [Menú, Base menú, 109,00€, 73, 7.957,00€, nota]
// [, Canelon cigala, 10,50€, 73, 766,50€]
// ...
// [Totales, Total Boda actualmente, , , 18.225,00€]
// [, TOTAL FACTURA, , , 20.047,50€]

function parseCuentas(rows: Row[], sec: Record<string, number>) {
  const result: {
    precio_adulto: number
    precio_nino: number
    precio_profesional: number
    precio_menu_total: number
    extras: Array<{ concepto: string; precio_unitario: number; unidades: number; total: number; notas?: string }>
    total_boda: number
    total_factura: number
  } = {
    precio_adulto: 0, precio_nino: 0, precio_profesional: 0, precio_menu_total: 0,
    extras: [], total_boda: 0, total_factura: 0,
  }

  if (sec['cuentas'] === undefined) return result

  let inExtrasTable = false

  rows.slice(sec['cuentas'] + 1).forEach(row => {
    const a = sl(row[0])
    const b = sl(row[1])
    const e = s(row[4])
    const f = s(row[5])

    // Precios resumen (col E=label, col F=precio)
    if (e.toLowerCase().includes('precio') && e.toLowerCase().includes('base')) {
      result.precio_adulto = n(f)
    } else if (e.toLowerCase().includes('infantil')) {
      result.precio_nino = n(f)
    } else if (e.toLowerCase().includes('profesional')) {
      result.precio_profesional = n(f)
    } else if (e.toLowerCase().includes('precio menú incluidas') || e.toLowerCase().includes('precio menu incluidas')) {
      result.precio_menu_total = n(f)
    }

    // Header tabla extras: "Costes unit." en col C
    if (s(row[2]).toLowerCase().includes('costes unit')) {
      inExtrasTable = true
      return
    }

    // Totales
    if (a === 'totales' || b.includes('total boda')) {
      result.total_boda = n(e)
    }
    if (b.includes('total factura')) {
      result.total_factura = n(e)
    }

    // Filas de extras (tabla): col B=concepto, col C=precio_unit, col D=unidades, col E=total
    if (inExtrasTable) {
      const concepto = s(row[1])
      const precioUnit = n(row[2])
      const unidades   = n(row[3])
      const total      = n(row[4])
      const notas      = s(row[5])

      if (concepto && concepto !== '-' && !b.includes('total') && !a.includes('pago') && !a.includes('reserva') && !a.includes('restante')) {
        result.extras.push({ concepto, precio_unitario: precioUnit, unidades, total, notas: notas || undefined })
      }
    }
  })

  return result
}

// ─── MAIN PROCESSOR ───────────────────────────────────────────────────────────

function processSheetRows(rows: Row[], sheetName: string, fileSource: string): SheetWeddingRaw | null {
  if (!rows.length) return null

  const sec = buildSectionMap(rows)
  const basic   = parseBasicInfo(rows, sheetName, fileSource)
  const menu    = parseMenu(rows, sec)
  const { special_menus, special_menus_detailed } = parseSpecialMenus(rows, sec)
  const barra   = parseBarraLibre(rows, sec)
  const contrat = parseContrataciones(rows, sec)
  const fechas  = parseFechas(rows, sec)
  const cliente = parseClientes(rows, sec)
  const montajes = parseMontajesYProtocolos(rows, sec)
  const cuentas  = parseCuentas(rows, sec)

  return {
    couples_name: basic.couples_name,
    clients:      basic.clients,
    date:         basic.date,
    coordinator:  basic.coordinator,
    adults:       basic.adults,
    children:     basic.children,
    professionals: basic.professionals,
    ceremony_type:  basic.ceremony_type,
    ceremony_time:  basic.ceremony_time,
    ceremony_place: basic.ceremony_place,
    service_type:   basic.service_type,
    start_time:     basic.start_time,
    end_time:       basic.end_time,
    file_source:    basic.file_source,
    menu: menu as SheetWeddingRaw['menu'],
    special_menus,
    special_menus_detailed,
    barra_libre_musica:      barra,
    contrataciones_externas: contrat,
    fechas_importantes:      fechas,
    cliente_info:            cliente,
    ubicacion_montajes:      montajes,
    cuentas_detalle:         cuentas,
    protocols: {},
    notes: [],
  }
}

// ─── FETCH FROM GOOGLE SHEET ──────────────────────────────────────────────────

export async function fetchFromGoogleSheet(config: SheetCoordConfig): Promise<{
  coordinadora: string; ok: boolean; weddings: SheetWeddingRaw[]; error?: string
}> {
  const url = config.sheetUrl?.trim()
  if (!url)
    return { coordinadora: config.coordinadora, ok: false, weddings: [], error: 'URL no configurada' }

  if (!isValidSheetUrl(url))
    return { coordinadora: config.coordinadora, ok: false, weddings: [], error: 'URL inválida de Google Sheets' }

  const spreadsheetId = extractSpreadsheetId(url)
  if (!spreadsheetId)
    return { coordinadora: config.coordinadora, ok: false, weddings: [], error: 'No se pudo extraer el ID de la hoja' }

  if (!SHEETS_API_KEY)
    return { coordinadora: config.coordinadora, ok: false, weddings: [], error: 'VITE_GOOGLE_SHEETS_API_KEY no configurada' }

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

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

    // 2. Filtrar pestañas que no son bodas
    const weddingTabs = allTabs.filter(name => {
      const nl = name.toLowerCase().trim()
      return !SKIP_SHEETS_KW.some(kw => nl.includes(kw))
    })

    // 3. Leer cada pestaña con throttle 2s
    const weddings: SheetWeddingRaw[] = []

    for (const tabName of weddingTabs) {
      let retries = 2
      while (retries > 0) {
        try {
          const encodedName = encodeURIComponent(tabName)
          const dataRes = await fetch(
            `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodedName}!A1:Z320?key=${SHEETS_API_KEY}`
          )
          if (dataRes.status === 429) {
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
        } catch { break }
      }
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
