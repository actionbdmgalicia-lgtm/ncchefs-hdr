// User & Auth Types
export type UserRole = 'admin' | 'coordinador' | 'asistente' | 'viewer'

export interface User {
  uid: string
  email: string
  name: string
  role: UserRole
  venues: string[]
  active: boolean
  createdAt: Date
  updatedAt: Date
}

// Wedding Types
export type WeddingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled'
export type WeddingHDRStatus = 'inicial' | 'prueba_menu' | 'final'

export interface MenuItem {
  id: string
  dishId: string
  name: string
  category: string
  quantity: number
  unit: string
  estimatedCost: number
}

export interface WeddingEvent {
  venue: string
  guestCount: {
    adults: number
    children: number
    professionals: number
  }
  ceremonyType: string
  serviceType: string
}

export interface WeddingMenu {
  items: MenuItem[]
  totalDishes: number
  estimatedCost: number
}

export interface Wedding {
  id: string
  clientName: string
  clientEmail: string
  coordinatorId: string
  coordinatorName: string
  date: Date
  startTime: string
  endTime: string
  event: WeddingEvent
  menu: WeddingMenu
  notes: string
  status: WeddingStatus
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

// Dish Types
export type DishCategory = 'Complementos' | 'Cóctel' | 'Entrada' | 'Plato Principal' | 'Postre' | 'Bebida' | 'Otro'

export interface Ingredient {
  id: string
  name: string
  quantity: number
  unit: string
  cost: number
}

export interface DishRecipe {
  ingredients: Ingredient[]
  servings: number
  instructions: string
}

export interface DishSupplier {
  name: string
  contact?: string
}

export interface DishNutritional {
  allergens: string[]
  vegan: boolean
  glutenFree: boolean
}

export interface Dish {
  id: string
  name: string
  category: DishCategory
  recipe: DishRecipe
  supplier?: DishSupplier
  estimatedCost: number
  nutritional?: DishNutritional
  tags: string[]
  createdAt: Date
  createdBy: string
}

// Purchase Order Types
export type PurchaseOrderStatus = 'pending' | 'ordered' | 'delivered' | 'completed'

export interface PurchaseOrderItem {
  id: string
  ingredientName: string
  quantity: number
  unit: string
  supplier: string
  estimatedCost: number
  received: boolean
  deliveryDate?: Date
}

export interface PurchaseOrder {
  id: string
  weddingId: string
  description: string
  items: PurchaseOrderItem[]
  status: PurchaseOrderStatus
  totalCost: number
  date: Date
  createdBy: string
}

// Analytics Types
export interface WeddingStats {
  total: number
  byVenue: Record<string, number>
  totalGuests: number
  totalCost: number
}

export interface DishStats {
  mostUsed: Array<{ name: string; count: number }>
  byCategory: Record<string, number>
}

export interface SupplyStats {
  totalOrders: number
  totalSpent: number
  suppliers: string[]
}

export interface MonthlyAnalytics {
  id: string
  month: number
  year: number
  weddings: WeddingStats
  dishes: DishStats
  supplies: SupplyStats
}

// Form Types
export interface CreateWeddingFormData {
  clientName: string
  clientEmail: string
  date: Date
  startTime: string
  endTime: string
  venue: string
  adultsCount: number
  childrenCount: number
  professionalsCount: number
  ceremonyType: string
  serviceType: string
  notes: string
}

export interface CreateDishFormData {
  name: string
  category: DishCategory
  ingredients: Ingredient[]
  servings: number
  instructions: string
  supplierName?: string
  estimatedCost: number
  tags: string[]
}

// HDR Extended Types — all sections from Excel templates

export interface BarraLibreMusica {
  inicio_barra?: string       // hour HH:MM
  cierre_barra?: string
  dj?: string
  otros?: string
}

export interface AperitivoMontaje {
  ubicacion?: string
  manteleria?: string
}

export interface BanqueteMontaje {
  manteleria?: string
  bajoplato?: string
  num_mesas?: number
  flores?: string
  decoraciones?: string
}

export interface UbicacionMontajes {
  minutas?: string            // model name / seating plan
  seating_plan?: string
  aperitivo?: AperitivoMontaje
  banquete?: BanqueteMontaje
  decoraciones_generales?: string
}

export interface ContratacionesExternas {
  fotografo?: string
  video?: string
  animacion?: string
  autobuses?: string
  bandas?: string
  otros?: string
}

export interface FechasImportantes {
  confirmacion_invitados?: string   // ISO date string
  ingreso_inicial?: string
  ingreso_restante?: string
}

export interface ClienteInfo {
  nombres?: string
  telefonos?: string
  mails?: string
  direccion?: string
}

export interface ExtraCuenta {
  concepto: string
  precio_unitario?: number
  unidades_previstas?: number
  total_previsto?: number
  unidades_reales?: number
  total_real?: number
}

export interface CuentasDetalle {
  precio_adulto?: number
  precio_nino?: number
  precio_profesional?: number
  extras?: ExtraCuenta[]
}

// FIBA Integration Types
export interface FIBAPlato {
  id: string
  nombre: string
  precio: number
}

export interface FIBAGrupo {
  id: string
  nombre: string
  plato_ids: string[]
}

export interface FIBAMenuItem extends FIBAPlato {
  cantidadAdultos?: number
  cantidadNiños?: number
  addedFrom: 'manual' | 'fiba'
  addedAt: Date
}

// Versioning Types
export interface WeddingEvaluation {
  evaluatedBy: string
  evaluatedByName?: string
  date: Date
  notes: string
}

export interface WeddingVersionSnapshot {
  menu?: Record<string, any>
  protocols?: Record<string, any>
  financial?: Record<string, any>
  notes?: any
  timeline?: any[]
}

export interface WeddingVersion {
  id: string
  timestamp: Date
  changedBy: string
  changedByName: string
  reason?: string
  snapshot: WeddingVersionSnapshot
  evaluations?: {
    inicial?: WeddingEvaluation
    prueba_menu?: WeddingEvaluation
    final?: WeddingEvaluation
  }
}
