export type ProductCategory =
  | 'CFTV'
  | 'Energia'
  | 'Redes'
  | 'Controle de Acesso'
  | 'Cabeamento'
  | 'Nobreaks'
  | 'Racks'
  | 'Servicos'

export type ProposalStatus =
  | 'draft'
  | 'generated'
  | 'sent'
  | 'approved'
  | 'rejected'

export interface Product {
  id: string
  sku: string
  name: string
  description?: string | null
  brand?: string | null
  category: string
  subcategory?: string | null
  basePrice: number
  cost: number
  stock: number
  unit: string
  active: boolean
  attributes: Record<string, unknown>
  compatible: string[]
  required: string[]
  suggested: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: string
  companyName: string
  tradeName?: string | null
  cnpj?: string | null
  contactName?: string | null
  email?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProposalItem {
  id: string
  proposalId: string
  productId: string
  product: Product
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
  cost: number
  margin: number
  role?: string | null
  technicalNotes?: string | null
}

export interface CompanyProfile {
  id: string
  name: string
  type: string
  logoBase64?: string | null
  description?: string | null
  website?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Proposal {
  id: string
  number: string
  title: string
  vertical: string
  status: ProposalStatus
  customerId: string
  customer: Customer
  userId?: string | null
  executiveSummary?: string | null
  scope?: string | null
  commercialTerms?: string | null
  validityDays: number
  discount: number
  totalCost: number
  totalPrice: number
  totalDiscount: number
  margin: number
  notes?: string | null
  coverProfileId?: string | null
  introProfileId?: string | null
  scenarioDesc?: string | null
  scenarioDiagram?: string | null
  coverProfile?: CompanyProfile | null
  introProfile?: CompanyProfile | null
  items: ProposalItem[]
  createdAt: Date
  updatedAt: Date
}

export interface Rule {
  id: string
  name: string
  description?: string | null
  type: 'suggestion' | 'required' | 'alert' | 'error'
  condition: Record<string, unknown>
  action: Record<string, unknown>
  priority: number
  active: boolean
}

export interface RuleAlert {
  type: 'alert' | 'error' | 'suggestion' | 'required'
  severity: 'info' | 'warning' | 'error'
  message: string
  skus?: string[]
  ruleId?: string
  ruleName?: string
}

export interface RuleEngineResult {
  alerts: RuleAlert[]
  errors: RuleAlert[]
  suggestions: RuleAlert[]
  requiredMissing: RuleAlert[]
  isBlocked: boolean
}

export interface BOMCommercialItem {
  sku: string
  name: string
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
  margin: number
}

export interface BOMTechnicalItem {
  sku: string
  name: string
  quantity: number
  category: string
  role: string
  technicalNotes: string
  dependencies: string[]
  compatibilities: string[]
}

export interface DashboardStats {
  totalProposals: number
  draftProposals: number
  approvedProposals: number
  totalProducts: number
  totalCustomers: number
  totalRevenue: number
  recentProposals: Proposal[]
}
