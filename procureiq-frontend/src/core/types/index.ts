// ─── Global TypeScript types shared across ProcureIQ ─────────────────────────

export type UserRole = 'admin' | 'procurement_manager' | 'analyst' | 'viewer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
  avatarUrl?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  errors?: ApiError[];
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

// ─── Spend ───────────────────────────────────────────────────────────────────

export interface SpendTransaction {
  id: string;
  supplierId: string;
  supplierName: string;
  poNumber: string;
  poDate: string;
  invoiceNumber: string;
  invoiceDate: string;
  amountUsd: number;
  costCenter: string;
  glAccount: string;
  commodityCode: string;
  country: string;
  paymentTerms: string;
  ingestionId: string;
}

export interface SpendKPIs {
  totalSpend: number;
  totalSpendDelta: number;       // % vs prior period
  activeSuppliers: number;
  activeContractsCount: number;
  tailSpendPercent: number;
  contractedSpendPercent: number;
  savingsIdentified: number;
  procurementHealthScore: number;
}

// ─── Supplier ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  canonicalName: string;
  aliases: string[];
  country: string;
  category: string;
  tier: 1 | 2 | 3;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  totalSpendUsd: number;
  activeContracts: number;
}

// ─── Contract ────────────────────────────────────────────────────────────────

export type ContractStatus = 'active' | 'expiring_soon' | 'expired' | 'draft' | 'terminated';

export interface Contract {
  id: string;
  supplierId: string;
  supplierName: string;
  title: string;
  startDate: string;
  endDate: string;
  valueUsd: number;
  status: ContractStatus;
  documentPath?: string;
  extractedClauses?: ContractClause[];
}

export interface ContractClause {
  type: string;
  text: string;
  riskFlag?: 'low' | 'medium' | 'high';
  riskReason?: string;
}

// ─── Risk ─────────────────────────────────────────────────────────────────────

export interface SupplierRiskScore {
  supplierId: string;
  supplierName: string;
  scoreDate: string;
  financialScore: number;
  geoScore: number;
  esgScore: number;
  operationalScore: number;
  compositeScore: number;
}

// ─── Savings ──────────────────────────────────────────────────────────────────

export type SavingsOpportunityType =
  | 'consolidation'
  | 'renegotiation'
  | 'substitution'
  | 'contract_compliance'
  | 'tail_spend_reduction';

export interface SavingsOpportunity {
  id: string;
  type: SavingsOpportunityType;
  supplierId?: string;
  supplierName?: string;
  estimatedValueUsd: number;
  confidence: number;
  effort: 'low' | 'medium' | 'high';
  status: 'identified' | 'in_progress' | 'realized' | 'dismissed';
  igniteRationale: string;
}

// ─── Ingestion / IDE ──────────────────────────────────────────────────────────

export type IngestionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';

export interface IngestionRun {
  id: string;
  filename: string;
  fileType: string;
  status: IngestionStatus;
  healthScore: number;
  rowsTotal: number;
  rowsClean: number;
  rowsQuarantined: number;
  correctionReport: CorrectionEntry[];
  createdAt: string;
}

export interface CorrectionEntry {
  stage: string;
  description: string;
  affectedRows: number;
  action: string;
}

// ─── Ignite ───────────────────────────────────────────────────────────────────

export type IgniteMessageRole = 'user' | 'assistant' | 'tool';

export interface IgniteMessage {
  id: string;
  role: IgniteMessageRole;
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
  isLocalInference?: boolean;
  timestamp: string;
}

export interface Citation {
  sourceType: 'spend_data' | 'contract' | 'supplier' | 'risk_score' | 'forecast';
  label: string;
  value?: string | number;
}
