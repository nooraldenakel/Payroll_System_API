export type PeriodStatus = 'OPEN' | 'PROCESSING' | 'CLOSED' | 'ARCHIVED' | 'DRAFT';

export interface PayrollPeriod {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  payDate: string;
  status: PeriodStatus;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  employeeCount: number;
  currency: string;
  exchangeRate?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'SUSPENDED';
export type PaymentStatus = 'PAID' | 'UNPAID' | 'STOPPED';

export interface Employee {
  id: string;
  employeeCode: string;
  nationalId: string;
  fullName: string;
  department: string;
  position: string;
  baseSalary: number;
  arrivalFee: number; // 0.05 default rule
  bonus: number;
  insurance: number;
  insuranceIqd?: number;
  absence: number;
  absenceDays?: number;
  searchFee: number;
  searchFeeIqd?: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  currency: 'USD' | 'IQD';
  isForeign?: boolean;
  status: EmployeeStatus;
  paymentStatus: PaymentStatus;
  paidAt?: string;
  paidBy?: string;
  bankAccount?: string;
  bankName?: string;
  joinDate?: string;
  periodId?: string;
  sheetSource?: string;
}

export interface DepartmentSummary {
  department: string;
  employeeCount: number;
  totalNet: number;
  totalGross: number;
  percentage: number;
  arabicName?: string;
}

export interface CurrencySummary {
  currency: 'USD' | 'IQD';
  totalAmount: number;
  employeeCount: number;
}

export interface ReportSummary {
  periodId: string;
  periodName: string;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  totalTaxes: number;
  employerTaxes: number;
  employeeCount: number;
  departmentBreakdown: DepartmentSummary[];
  currencyBreakdown: CurrencySummary[];
}

export type FieldDataType =
  | 'Alphanumeric'
  | 'Text'
  | 'Currency'
  | 'Numeric'
  | 'Number'
  | 'Percentage'
  | 'Date'
  | 'Boolean'
  | 'Calculated';

export interface DynamicField {
  id: string;
  name: string;
  key: string;
  type: FieldDataType;
  required: boolean;
  system: boolean;
  excelHeader?: string;
  description?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Suspended' | string;
  avatarUrl?: string;
}

export interface SystemSettings {
  institutionName: string;
  institutionCode: string;
  defaultCurrency: 'USD' | 'IQD';
  usdToIqdRate: number;
  taxRegistrationNumber: string;
  fiscalYear: string;
  payCycle: 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY';
  autoCalculateAllowances: boolean;
  strictStatutoryDeductions: boolean;
  enableAuditLog: boolean;
  apiUrl: string;
  dynamicFields: DynamicField[];
  adminUsers: AdminUser[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatarUrl?: string;
}

export interface ImportPreviewItem {
  rowNumber: number;
  fullName: string;
  nationalId: string;
  department: string;
  position: string;
  baseSalary: number;
  arrivalFee?: number;
  searchFee?: number;
  netPay?: number;
  currency: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
  errorMessage?: string;
}

export interface ImportHistoryItem {
  id: string;
  fileName: string;
  periodName: string;
  uploadedBy: string;
  uploadDate: string;
  recordCount: number;
  successCount: number;
  status: 'COMPLETED' | 'FAILED' | 'PROCESSING';
}

export interface AuditLogEvent {
  id: string;
  title: string;
  timestamp: string;
  timeDisplay: string;
  actorName: string;
  actorId: string;
  actorRole: string;
  category: 'SALARY' | 'DISBURSAL' | 'IMPORT' | 'SYSTEM' | 'SECURITY';
  summary: string;
  previousValue?: string;
  newValue?: string;
  badgeText?: string;
  badgeType?: 'success' | 'warning' | 'info' | 'error';
}
