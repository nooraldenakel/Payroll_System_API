'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Employee {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  type: 'Full-Time' | 'Contractor' | 'Part-Time';
  department: 'Engineering' | 'Design' | 'Marketing' | 'Human Resources' | 'Finance' | 'Operations';
  baseSalary: number;
  bonus: number;
  insurance: number;
  absenceDays: number;
  absenceDeduction: number;
  searchingDocFee?: number;
  isForeign?: boolean;
  currency?: 'USD' | 'Dinar';
  hasRecruitmentFee?: boolean;
  recruitmentFee?: number;
  deductions?: number;
  netSalary: number;
  salaryState: 'Paid' | 'Not Yet' | 'Stopped';
  paidAt?: string;
  status: 'Active' | 'On Leave' | 'Terminated';
  email: string;
  phone: string;
  joinDate: string;
  paymentStatus: 'Paid' | 'Unpaid';
}

export interface PayrollPeriod {
  id: string;
  name: string;
  ref: string;
  status: 'Active' | 'Draft' | 'Archived';
  employeesCount: number;
  totalPayroll: number;
  paidAmount: number;
  remainingAmount: number;
  processedCount: number;
  creator: string;
  createdOn: string;
  month: string;
  year: number;
}

export interface ExcelImportRecord {
  id: string;
  fileName: string;
  type: string;
  status: 'Success' | 'Errors' | 'Processing';
  recordsCount: number;
  errorCount: number;
  importedBy: string;
  date: string;
}

export interface AuditLogChange {
  field: string;
  from: string;
  to: string;
}

export interface AuditLogEntry {
  id: string;
  time: string;
  action: string;
  user: string;
  detail: string;
  icon: string;
  badgeColor: string;
  employeeId?: string;
  employeeName?: string;
  category?: 'Salary' | 'Employee' | 'Settings' | 'Import' | 'System';
  changes?: AuditLogChange[];
}

export interface SystemSettings {
  institutionName: string;
  institutionCode: string;
  institutionType: string;
  fiscalYear: string;
  defaultCurrency: string;
  usdToDinarRate: number;
  sealWatermarkEnabled: boolean;
  sealQrEnabled: boolean;
  sealImageUrl: string;
  autoSync: boolean;
  strictAudit: boolean;
  emailAlerts: boolean;
  alertRecipients: string;
  autoReportSchedule: 'Weekly' | 'Monthly' | 'Quarterly' | 'Disabled';
  multiCurrency: boolean;
  twoFactorAuth: boolean;
  twoFactorEnforcement: 'All Staff' | 'Admins & Disbursers' | 'Super Admin Only';
  sessionTimeoutMinutes: number;
  dualSignatureDisbursement: boolean;
  anomalyDetectionAlerts: boolean;
  dynamicFields: { id: string; name: string; type: string }[];
  adminUsers: { id: string; name: string; initials: string; email: string; role: string; status: string }[];
}

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface PayrollContextType {
  // Periods
  periods: PayrollPeriod[];
  activePeriod: PayrollPeriod;
  setActivePeriodId: (id: string) => void;
  addPeriod: (period: Omit<PayrollPeriod, 'id' | 'ref'>) => void;
  updatePeriodStatus: (periodId: string, status: 'Active' | 'Draft' | 'Archived') => void;
  archivePeriod: (periodId: string) => void;
  reopenPeriod: (periodId: string) => void;

  // Employees
  employees: Employee[];
  periodEmployeesMap: { [periodId: string]: Employee[] };
  addEmployee: (employee: Omit<Employee, 'id' | 'netSalary'>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  toggleSalaryState: (id: string, nextState?: 'Paid' | 'Not Yet' | 'Stopped') => void;
  deleteEmployee: (id: string) => void;
  importEmployees: (importedEmployees: Employee[], fileName: string) => void;

  // Excel Imports
  imports: ExcelImportRecord[];
  addImportRecord: (record: Omit<ExcelImportRecord, 'id'>) => void;
  deleteImportRecord: (id: string) => void;
  clearImports: () => void;

  // Audit Logs
  auditLogs: AuditLogEntry[];
  addAuditLog: (action: string, detail: string, icon?: string, options?: any) => void;

  // Settings
  settings: SystemSettings;
  updateSettings: (updates: Partial<SystemSettings>) => void;
  addDynamicField: (field: { name: string; type: string }) => void;
  removeDynamicField: (id: string) => void;
  addAdminUser: (user: { name: string; email: string; role: string }) => void;

  // Modals & UI State
  isNewRunModalOpen: boolean;
  setIsNewRunModalOpen: (open: boolean) => void;
  isAddEmployeeModalOpen: boolean;
  setIsAddEmployeeModalOpen: (open: boolean) => void;
  sidebarFrozen: boolean;
  setSidebarFrozen: (v: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebarFrozen: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  sidebarHidden: boolean;
  setSidebarHidden: (v: boolean | ((prev: boolean) => boolean)) => void;
  sidebarPinned: boolean;
  setSidebarPinned: (v: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebarCollapse: () => void;
  toggleSidebarHide: () => void;
  toggleSidebarPin: () => void;
  toasts: ToastMessage[];
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  dismissToast: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const initialPeriods: PayrollPeriod[] = [
  {
    id: 'PR-2608',
    name: 'August 2026',
    ref: 'PR-2608-gov',
    status: 'Active',
    employeesCount: 0,
    totalPayroll: 0,
    paidAmount: 0,
    remainingAmount: 0,
    processedCount: 0,
    creator: 'Aziz Sulaiman',
    createdOn: 'Aug 1, 2026',
    month: 'AUG',
    year: 2026,
  },
  {
    id: 'PR-2609',
    name: 'September 2026',
    ref: 'PR-2609-gov',
    status: 'Draft',
    employeesCount: 0,
    totalPayroll: 0,
    paidAmount: 0,
    remainingAmount: 0,
    processedCount: 0,
    creator: 'System Scheduled',
    createdOn: 'Aug 15, 2026',
    month: 'SEP',
    year: 2026,
  },
  {
    id: 'PR-2607',
    name: 'July 2026',
    ref: 'PR-2607-gov',
    status: 'Archived',
    employeesCount: 0,
    totalPayroll: 0,
    paidAmount: 0,
    remainingAmount: 0,
    processedCount: 0,
    creator: 'Aziz Sulaiman',
    createdOn: 'Jul 1, 2026',
    month: 'JUL',
    year: 2026,
  },
  {
    id: 'PR-2606',
    name: 'June 2026',
    ref: 'PR-2606-gov',
    status: 'Archived',
    employeesCount: 0,
    totalPayroll: 0,
    paidAmount: 0,
    remainingAmount: 0,
    processedCount: 0,
    creator: 'Aziz Sulaiman',
    createdOn: 'Jun 1, 2026',
    month: 'JUN',
    year: 2026,
  },
];

// Helper to seed per-period employee data snapshots (defaults to empty unless imported)
function generateSeedEmployeesForPeriod(_period: PayrollPeriod): Employee[] {
  return [];
}

const initialImports: ExcelImportRecord[] = [
  {
    id: 'IMP-01',
    fileName: 'aug_bonuses_final.xlsx',
    type: 'Bonus Data',
    status: 'Success',
    recordsCount: 245,
    errorCount: 0,
    importedBy: 'Aziz Sulaiman',
    date: 'Aug 24, 2:30 PM',
  },
  {
    id: 'IMP-02',
    fileName: 'new_hires_q3.csv',
    type: 'Employee Rosters',
    status: 'Success',
    recordsCount: 12,
    errorCount: 0,
    importedBy: 'System API',
    date: 'Aug 23, 9:15 AM',
  },
  {
    id: 'IMP-03',
    fileName: 'deductions_update_v2.xlsx',
    type: 'Deductions',
    status: 'Errors',
    recordsCount: 1200,
    errorCount: 3,
    importedBy: 'Aziz Sulaiman',
    date: 'Aug 22, 4:45 PM',
  },
  {
    id: 'IMP-04',
    fileName: 'attendance_aug_1_15.csv',
    type: 'Timesheets',
    status: 'Success',
    recordsCount: 18600,
    errorCount: 0,
    importedBy: 'TimeClock App',
    date: 'Aug 16, 1:00 AM',
  },
];

const initialAuditLogs: AuditLogEntry[] = [
  {
    id: 'AUD-01',
    time: '03:51 AM today',
    action: 'Employee Compensation Updated',
    user: 'Aziz Sulaiman',
    employeeId: 'EMP-1244',
    employeeName: 'Claire Beauchamp',
    category: 'Salary',
    detail: 'Modified Claire Beauchamp (EMP-1244): Base Salary IQD 6,000 ➔ IQD 6,500 | Insurance IQD 0 ➔ IQD 200 | Net Salary IQD 5,135 ➔ IQD 5,435.',
    icon: 'edit_note',
    badgeColor: 'bg-blue-50 text-blue-700 border border-blue-200',
    changes: [
      { field: 'Base Salary', from: 'IQD 6,000', to: 'IQD 6,500' },
      { field: 'Insurance', from: 'IQD 0', to: 'IQD 200' },
      { field: 'Absence', from: '0 days', to: '4 days (-IQD 865)' },
      { field: 'Net Salary', from: 'IQD 5,135', to: 'IQD 5,435' },
    ],
  },
  {
    id: 'AUD-02',
    time: '03:50 AM today',
    action: 'Salary Disbursement Status Changed',
    user: 'Aziz Sulaiman',
    employeeId: 'EMP-042',
    employeeName: 'Jane Smith',
    category: 'Salary',
    detail: 'Changed salary state for Jane Smith (EMP-042) from ⚪ Unpaid ➔ 🟢 Paid. Net Payout: $2,850.',
    icon: 'check_circle',
    badgeColor: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    changes: [
      { field: 'Salary State', from: '⚪ Unpaid', to: '🟢 Paid (Recorded: Aug 24, 2:30 PM)' },
      { field: 'Disbursement Payout', from: 'Pending', to: '$2,850.00' },
    ],
  },
];

const initialSettings: SystemSettings = {
  institutionName: 'General Directorate of Municipalities & Public Works',
  institutionCode: 'GOV-IQ-FIN-2026-HQ',
  institutionType: 'Government Ministry (Public Sector)',
  fiscalYear: 'FY 2026 – 2027',
  defaultCurrency: 'Dinar (IQD)',
  usdToDinarRate: 1310,
  sealWatermarkEnabled: true,
  sealQrEnabled: true,
  sealImageUrl: '',
  autoSync: true,
  strictAudit: true,
  emailAlerts: true,
  alertRecipients: 'audit-board@gov.iq, finance.director@gov.iq',
  autoReportSchedule: 'Monthly',
  multiCurrency: true,
  twoFactorAuth: true,
  twoFactorEnforcement: 'Admins & Disbursers',
  sessionTimeoutMinutes: 15,
  dualSignatureDisbursement: true,
  anomalyDetectionAlerts: true,
  dynamicFields: [
    { id: 'df-1', name: 'Employee ID', type: 'Alphanumeric' },
    { id: 'df-2', name: 'Base Salary', type: 'Currency' },
    { id: 'df-3', name: 'Search Fee', type: 'Currency' },
    { id: 'df-4', name: 'Department Code', type: 'Alphanumeric' },
    { id: 'df-5', name: 'Tax Bracket ID', type: 'Numeric' },
    { id: 'df-6', name: 'Emergency Contact', type: 'Alphanumeric' },
  ],
  adminUsers: [
    { id: 'u-1', name: 'Aziz Sulaiman', initials: 'AS', email: 'aziz@institution.gov', role: 'Super Admin', status: 'Active' },
    { id: 'u-2', name: 'Sarah Jenkins', initials: 'SJ', email: 's.jenkins@institution.gov', role: 'Editor', status: 'Offline' },
    { id: 'u-3', name: 'David Miller', initials: 'DM', email: 'd.miller@institution.gov', role: 'Payroll Auditor', status: 'Active' },
  ],
};

const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

export function PayrollProvider({ children }: { children: ReactNode }) {
  const [periods, setPeriods] = useState<PayrollPeriod[]>(initialPeriods);
  const [activePeriodId, setActivePeriodIdState] = useState<string>('PR-2608');
  
  // Per-Period Employee Data Store: each month has its own isolated roster
  const [periodEmployeesMap, setPeriodEmployeesMap] = useState<{ [periodId: string]: Employee[] }>(() => {
    const initialMap: { [periodId: string]: Employee[] } = {};
    initialPeriods.forEach((p) => {
      initialMap[p.id] = generateSeedEmployeesForPeriod(p);
    });
    return initialMap;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    return generateSeedEmployeesForPeriod(initialPeriods[0]);
  });

  const [imports, setImports] = useState<ExcelImportRecord[]>(initialImports);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs);
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [sidebarFrozen, setSidebarFrozen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSidebarFrozen = () => {
    setSidebarFrozen((prev) => {
      const next = !prev;
      showToast(next ? 'Sidebar Frozen Open' : 'Sidebar Auto-Shrink', next ? 'Sidebar will remain expanded across all pages.' : 'Sidebar will auto-shrink across all pages.');
      return next;
    });
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const toggleSidebarHide = () => {
    setSidebarHidden((prev) => !prev);
  };

  const toggleSidebarPin = () => {
    setSidebarPinned((prev) => {
      const next = !prev;
      showToast(next ? 'Sidebar Frozen / Pinned' : 'Sidebar Unpinned', next ? 'Sidebar is locked in place.' : 'Sidebar can now auto-slide.');
      return next;
    });
  };

  const activePeriod = periods.find((p) => p.id === activePeriodId) || periods[0];

  const showToast = (title: string, message: string, type: ToastMessage['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addAuditLog = (
    action: string,
    detail: string,
    icon = 'history',
    options?: {
      employeeId?: string;
      employeeName?: string;
      category?: 'Salary' | 'Employee' | 'Settings' | 'Import' | 'System';
      changes?: AuditLogChange[];
      badgeColor?: string;
    }
  ) => {
    const newEntry: AuditLogEntry = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' today',
      action,
      user: 'Aziz Sulaiman',
      detail,
      icon,
      badgeColor: options?.badgeColor || 'bg-primary/10 text-primary',
      employeeId: options?.employeeId,
      employeeName: options?.employeeName,
      category: options?.category || 'Employee',
      changes: options?.changes,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // Safe Period Switching: saves current roster snapshot and loads target roster
  const setActivePeriodId = (newPeriodId: string) => {
    const prevPeriod = periods.find((p) => p.id === activePeriodId);
    const targetPeriod = periods.find((p) => p.id === newPeriodId);
    if (!targetPeriod) return;

    // Save active employees before switching
    setPeriodEmployeesMap((prev) => ({
      ...prev,
      [activePeriodId]: employees,
    }));

    // Retrieve or initialize target period employees
    const targetEmps = periodEmployeesMap[newPeriodId] || generateSeedEmployeesForPeriod(targetPeriod);
    setEmployees(targetEmps);
    setActivePeriodIdState(newPeriodId);

    if (targetPeriod.status === 'Archived') {
      addAuditLog(
        'Archived Cycle Activated',
        `Switched active ledger to Archived Cycle "${targetPeriod.name}". Modifications will be tracked as historical adjustments.`,
        'history_toggle_off',
        {
          category: 'System',
          badgeColor: 'bg-amber-50 text-amber-800 border border-amber-200',
        }
      );
      showToast(
        'Archived Cycle Active',
        `Switched to "${targetPeriod.name}" (Archived). Any modifications will trigger strict historical audit logs.`,
        'warning'
      );
    } else {
      addAuditLog(
        'Active Cycle Switched',
        `Switched active cycle from "${prevPeriod?.name}" to "${targetPeriod.name}". Previous session saved in ledger.`,
        'change_circle',
        {
          category: 'System',
          badgeColor: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
        }
      );
      showToast('Cycle Activated', `Switched active cycle to "${targetPeriod.name}". Session preserved.`);
    }
  };

  const addPeriod = (periodData: Omit<PayrollPeriod, 'id' | 'ref'>) => {
    const id = `PR-${Date.now().toString().slice(-4)}`;
    const newP: PayrollPeriod = {
      ...periodData,
      id,
      ref: `${id}-gov`,
    };
    setPeriods((prev) => [newP, ...prev]);

    // Initialize period employee map
    setPeriodEmployeesMap((prev) => ({
      ...prev,
      [id]: generateSeedEmployeesForPeriod(newP),
    }));

    addAuditLog(
      'New Payroll Period Created',
      `Created cycle "${newP.name}" with ref ${newP.ref}.`,
      'calendar_month',
      {
        category: 'System',
        badgeColor: 'bg-primary/10 text-primary',
        changes: [
          { field: 'Cycle Name', from: 'None', to: newP.name },
          { field: 'Reference', from: 'None', to: newP.ref },
        ],
      }
    );
    showToast('Period Created', `Successfully initiated cycle for ${newP.name}.`);
  };

  const updatePeriodStatus = (periodId: string, nextStatus: 'Active' | 'Draft' | 'Archived') => {
    const p = periods.find((item) => item.id === periodId);
    if (!p) return;
    const prevStatus = p.status;

    setPeriods((prev) =>
      prev.map((item) => (item.id === periodId ? { ...item, status: nextStatus } : item))
    );

    addAuditLog(
      `Cycle Status Changed: ${nextStatus}`,
      `Changed period "${p.name}" status from ${prevStatus} ➔ ${nextStatus}.`,
      nextStatus === 'Archived' ? 'lock' : nextStatus === 'Active' ? 'play_circle' : 'schedule',
      {
        category: 'System',
        badgeColor: nextStatus === 'Archived' ? 'bg-slate-100 text-slate-800 border border-slate-300' : 'bg-emerald-50 text-emerald-800 border border-emerald-200',
        changes: [{ field: 'Period Status', from: prevStatus, to: nextStatus }],
      }
    );

    showToast(
      `Cycle ${nextStatus}`,
      `Cycle "${p.name}" status is now ${nextStatus}.${nextStatus === 'Archived' ? ' Ledger is archived and sealed.' : ''}`,
      nextStatus === 'Archived' ? 'info' : 'success'
    );
  };

  const archivePeriod = (periodId: string) => {
    updatePeriodStatus(periodId, 'Archived');
  };

  const reopenPeriod = (periodId: string) => {
    updatePeriodStatus(periodId, 'Active');
  };

  const calculateNetSalary = (
    baseSalaryInput: number,
    bonusInput: number | string = 0,
    insuranceInput: number | string = 0,
    absenceDeductionInput: number | string = 0,
    hasRecruitmentFee = false,
    searchingDocFeeInput: number | string = 0,
    isForeign = false
  ) => {
    let baseSalary = Number(baseSalaryInput) || 0;
    // Rule: If Local employee and base salary is < 20,000, multiply by 1000
    if (!isForeign && baseSalary > 0 && baseSalary < 20000) {
      baseSalary = baseSalary * 1000;
    }

    const currentUsdRate = settings?.usdToDinarRate || 1310;
    
    // Scale < 1000 by 1000 for Dinar amounts, convert to USD for foreign
    const processAmount = (valInput: number | string): number => {
      const str = String(valInput || '').trim();
      const isExplicitDollar = str.includes('$') || /usd/i.test(str);
      const sanitized = str.replace(/[$€£¥,]/g, '').replace(/(usd|iqd|dinar)/gi, '').trim();
      let val = parseFloat(sanitized) || 0;
      if (val <= 0) return 0;

      if (!isForeign) {
        if (val > 0 && val < 1000) {
          val = val * 1000;
        }
        return val;
      } else {
        if (isExplicitDollar) {
          return val;
        }
        let dinarVal = val;
        if (dinarVal > 0 && dinarVal < 1000) {
          dinarVal = dinarVal * 1000;
        }
        return Math.round((dinarVal / currentUsdRate) * 100) / 100;
      }
    };

    const normBonus = processAmount(bonusInput);
    const normInsurance = processAmount(insuranceInput);
    const normDocFee = processAmount(searchingDocFeeInput);
    const normAbsence = processAmount(absenceDeductionInput);

    const recruitmentFee = hasRecruitmentFee ? baseSalary * 0.05 : 0;
    const effectiveBase = baseSalary - recruitmentFee;
    return Math.max(0, effectiveBase + normBonus - normInsurance - normAbsence - normDocFee);
  };

  const addEmployee = (empData: Omit<Employee, 'id' | 'netSalary'>) => {
    const id = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
    const isForeign = Boolean(empData.isForeign);
    let baseSalary = Number(String(empData.baseSalary).replace(/[$€£¥,]/g, '').trim()) || 0;
    // Rule: If Local employee and base salary is < 20,000, multiply by 1000
    if (!isForeign && baseSalary > 0 && baseSalary < 20000) {
      baseSalary = baseSalary * 1000;
    }

    const currentUsdRate = settings?.usdToDinarRate || 1310;
    const processAmount = (valInput: number | string): number => {
      const str = String(valInput || '').trim();
      const isExplicitDollar = str.includes('$') || /usd/i.test(str);
      const sanitized = str.replace(/[$€£¥,]/g, '').replace(/(usd|iqd|dinar)/gi, '').trim();
      let val = parseFloat(sanitized) || 0;
      if (val <= 0) return 0;

      if (!isForeign) {
        if (val > 0 && val < 1000) {
          val = val * 1000;
        }
        return val;
      } else {
        if (isExplicitDollar) {
          return val;
        }
        let dinarVal = val;
        if (dinarVal > 0 && dinarVal < 1000) {
          dinarVal = dinarVal * 1000;
        }
        return Math.round((dinarVal / currentUsdRate) * 100) / 100;
      }
    };

    const searchingDocFee = processAmount(empData.searchingDocFee || 0);
    const bonus = processAmount(empData.bonus || 0);
    const insurance = processAmount(empData.insurance || 0);
    const absenceDeduction = processAmount(empData.absenceDeduction || 0);
    const hasRecruitmentFee = Boolean(empData.hasRecruitmentFee);
    const recruitmentFee = hasRecruitmentFee ? baseSalary * 0.05 : 0;
    const currency = isForeign ? 'USD' : (empData.currency || 'Dinar');
    const currSym = isForeign ? '$' : 'IQD ';

    const netSalary = calculateNetSalary(
      baseSalary,
      bonus,
      insurance,
      absenceDeduction,
      hasRecruitmentFee,
      searchingDocFee,
      isForeign
    );

    const now = new Date();
    const paidAtStr = empData.salaryState === 'Paid'
      ? now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : undefined;

    const newSalaryState = baseSalary <= 0 ? 'Stopped' : (empData.salaryState || 'Not Yet');
    const newEmp: Employee = {
      ...empData,
      id,
      baseSalary,
      searchingDocFee,
      bonus,
      insurance,
      absenceDeduction,
      isForeign,
      currency,
      hasRecruitmentFee,
      recruitmentFee,
      netSalary,
      salaryState: newSalaryState,
      paidAt: empData.paidAt || paidAtStr,
    };

    const isArchivedCycle = activePeriod.status === 'Archived';

    setEmployees((prev) => {
      const updated = [newEmp, ...prev];
      setPeriodEmployeesMap((m) => ({ ...m, [activePeriodId]: updated }));
      return updated;
    });

    addAuditLog(
      isArchivedCycle ? `Historical Staff Added [${activePeriod.name}]` : 'New Employee Enrolled',
      `${isArchivedCycle ? `[HISTORICAL ARCHIVE: ${activePeriod.name}] ` : ''}Registered ${newEmp.name} (${id}) in ${newEmp.department}: Base ${currSym}${baseSalary.toLocaleString()} | Net ${currSym}${netSalary.toLocaleString()}.`,
      'person_add',
      {
        employeeId: id,
        employeeName: newEmp.name,
        category: 'Employee',
        changes: [
          { field: 'Base Salary', from: 'None', to: `${currSym}${baseSalary.toLocaleString()}` },
          { field: 'Workforce Type', from: 'None', to: isForeign ? 'Foreign (USD $)' : 'Local (Dinar)' },
          { field: 'Net Payout', from: 'None', to: `${currSym}${netSalary.toLocaleString()}` },
          { field: 'Salary State', from: 'None', to: '⚪ Unpaid' },
        ],
        badgeColor: isArchivedCycle ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-teal-50 text-teal-800 border border-teal-200',
      }
    );

    showToast(
      isArchivedCycle ? 'Historical Record Added' : 'Employee Added',
      `${newEmp.name} registered in ${activePeriod.name}. Net Salary ${currency === 'USD' ? '$' : 'IQD '}${netSalary.toLocaleString()}.`
    );
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    const currentEmp = employees.find((e) => e.id === id);
    if (!currentEmp) return;

    const changesList: AuditLogChange[] = [];
    const isForeign = updates.isForeign !== undefined ? Boolean(updates.isForeign) : Boolean(currentEmp.isForeign);
    const currSym = isForeign ? '$' : 'IQD ';
    const prevCurrSym = currentEmp.isForeign ? '$' : 'IQD ';

    let nextBase = updates.baseSalary !== undefined ? Number(updates.baseSalary) : currentEmp.baseSalary;
    if (!isForeign && nextBase > 0 && nextBase < 20000) {
      nextBase = nextBase * 1000;
    }

    if (updates.name !== undefined && updates.name !== currentEmp.name) {
      changesList.push({ field: 'Employee Name', from: currentEmp.name, to: updates.name });
    }
    if (nextBase !== currentEmp.baseSalary) {
      changesList.push({ field: 'Base Salary', from: `${prevCurrSym}${currentEmp.baseSalary.toLocaleString()}`, to: `${currSym}${nextBase.toLocaleString()}` });
    }
    if (updates.isForeign !== undefined && Boolean(updates.isForeign) !== Boolean(currentEmp.isForeign)) {
      changesList.push({ field: 'Workforce Type', from: currentEmp.isForeign ? 'Foreign (USD $)' : 'Local (Dinar)', to: updates.isForeign ? 'Foreign (USD $)' : 'Local (Dinar)' });
    }
    if (updates.hasRecruitmentFee !== undefined && Boolean(updates.hasRecruitmentFee) !== Boolean(currentEmp.hasRecruitmentFee)) {
      changesList.push({ field: 'Arrival Fee (0.05)', from: currentEmp.hasRecruitmentFee ? 'Active (-5%)' : 'None', to: updates.hasRecruitmentFee ? 'Active (-5%)' : 'None' });
    }
    if (updates.bonus !== undefined && Number(updates.bonus) !== currentEmp.bonus) {
      changesList.push({ field: 'Bonus', from: `${prevCurrSym}${currentEmp.bonus.toLocaleString()}`, to: `+${currSym}${Number(updates.bonus).toLocaleString()}` });
    }
    if (updates.insurance !== undefined && Number(updates.insurance) !== currentEmp.insurance) {
      changesList.push({ field: 'Insurance', from: `${prevCurrSym}${currentEmp.insurance.toLocaleString()}`, to: `-${currSym}${Number(updates.insurance).toLocaleString()}` });
    }
    if (updates.searchingDocFee !== undefined && Number(updates.searchingDocFee) !== (currentEmp.searchingDocFee || 0)) {
      changesList.push({ field: 'Search Fee', from: `${prevCurrSym}${(currentEmp.searchingDocFee || 0).toLocaleString()}`, to: `-${currSym}${Number(updates.searchingDocFee).toLocaleString()}` });
    }
    if (updates.absenceDays !== undefined && Number(updates.absenceDays) !== currentEmp.absenceDays) {
      changesList.push({ field: 'Absence', from: `${currentEmp.absenceDays} days`, to: `${updates.absenceDays} days (-${currSym}${(Number(updates.absenceDeduction) || 0).toLocaleString()})` });
    }
    if (updates.salaryState !== undefined && updates.salaryState !== currentEmp.salaryState) {
      changesList.push({ field: 'Salary State', from: currentEmp.salaryState, to: updates.salaryState });
    }

    const currentUsdRate = settings?.usdToDinarRate || 1310;
    const processAmount = (valInput: number | string): number => {
      const str = String(valInput || '').trim();
      const isExplicitDollar = str.includes('$') || /usd/i.test(str);
      const sanitized = str.replace(/[$€£¥,]/g, '').replace(/(usd|iqd|dinar)/gi, '').trim();
      let val = parseFloat(sanitized) || 0;
      if (val <= 0) return 0;

      if (!isForeign) {
        if (val > 0 && val < 1000) {
          val = val * 1000;
        }
        return val;
      } else {
        if (isExplicitDollar) {
          return val;
        }
        let dinarVal = val;
        if (dinarVal > 0 && dinarVal < 1000) {
          dinarVal = dinarVal * 1000;
        }
        return Math.round((dinarVal / currentUsdRate) * 100) / 100;
      }
    };

    const hasRecruitmentFee = updates.hasRecruitmentFee !== undefined ? Boolean(updates.hasRecruitmentFee) : Boolean(currentEmp.hasRecruitmentFee);
    const nextBonus = processAmount(updates.bonus !== undefined ? updates.bonus : currentEmp.bonus);
    const nextInsurance = processAmount(updates.insurance !== undefined ? updates.insurance : currentEmp.insurance);
    const nextDocFee = processAmount(updates.searchingDocFee !== undefined ? updates.searchingDocFee : (currentEmp.searchingDocFee || 0));
    const nextAbsenceDeduct = processAmount(updates.absenceDeduction !== undefined ? updates.absenceDeduction : currentEmp.absenceDeduction);
    
    const newNetSalary = calculateNetSalary(nextBase, nextBonus, nextInsurance, nextAbsenceDeduct, hasRecruitmentFee, nextDocFee, isForeign);

    if (newNetSalary !== currentEmp.netSalary) {
      changesList.push({ field: 'The Net Salary', from: `${prevCurrSym}${currentEmp.netSalary.toLocaleString()}`, to: `${currSym}${newNetSalary.toLocaleString()}` });
    }

    const isArchivedCycle = activePeriod.status === 'Archived';

    setEmployees((prev) => {
      const updatedList = prev.map((emp) => {
        if (emp.id !== id) return emp;
        const updated = { ...emp, ...updates };
        const hasRecFee = Boolean(updated.hasRecruitmentFee);
        updated.isForeign = isForeign;
        updated.currency = updated.isForeign ? 'USD' : (updated.currency || 'Dinar');
        updated.baseSalary = nextBase;
        updated.bonus = nextBonus;
        updated.insurance = nextInsurance;
        updated.searchingDocFee = nextDocFee;
        updated.absenceDeduction = nextAbsenceDeduct;
        updated.recruitmentFee = hasRecFee ? nextBase * 0.05 : 0;
        updated.netSalary = newNetSalary;
        return updated;
      });
      setPeriodEmployeesMap((m) => ({ ...m, [activePeriodId]: updatedList }));
      return updatedList;
    });

    const diffSummary = changesList.length > 0
      ? changesList.map((c) => `${c.field}: ${c.from} ➔ ${c.to}`).join(' | ')
      : 'Modified employee profile settings.';

    addAuditLog(
      isArchivedCycle ? `Historical Record Updated [${activePeriod.name}]` : 'Employee Compensation Updated',
      `${isArchivedCycle ? `[HISTORICAL ARCHIVE: ${activePeriod.name}] ` : ''}Updated ledger breakdown for ${currentEmp.name} (${id}). Net Salary: ${currSym}${newNetSalary.toLocaleString()}.`,
      'edit_note',
      {
        employeeId: id,
        employeeName: currentEmp.name,
        category: 'Salary',
        changes: changesList,
        badgeColor: isArchivedCycle ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200',
      }
    );

    showToast(
      isArchivedCycle ? 'Historical Record Updated' : 'Employee Updated',
      `${isArchivedCycle ? `[Historical ${activePeriod.name}] ` : ''}Record for ${currentEmp.name} saved and audited.`
    );
  };

  const toggleSalaryState = (id: string, explicitState?: 'Paid' | 'Not Yet' | 'Stopped') => {
    const currentEmp = employees.find((e) => e.id === id);
    if (!currentEmp) return;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let nextState: 'Paid' | 'Not Yet' | 'Stopped';
    if (explicitState) {
      nextState = explicitState;
    } else {
      if (currentEmp.salaryState === 'Not Yet') nextState = 'Paid';
      else if (currentEmp.salaryState === 'Paid') nextState = 'Stopped';
      else nextState = 'Not Yet';
    }

    const paidAt = nextState === 'Paid' ? formattedDate : undefined;
    const paymentStatus: 'Paid' | 'Unpaid' = nextState === 'Paid' ? 'Paid' : 'Unpaid';
    const isArchivedCycle = activePeriod.status === 'Archived';

    setEmployees((prev) => {
      const updatedList = prev.map((emp) => {
        if (emp.id !== id) return emp;
        return {
          ...emp,
          salaryState: nextState,
          paidAt,
          paymentStatus,
        };
      });
      setPeriodEmployeesMap((m) => ({ ...m, [activePeriodId]: updatedList }));
      return updatedList;
    });

    const currSym = currentEmp.isForeign ? '$' : 'IQD ';
    const stateLabelFrom = currentEmp.salaryState === 'Not Yet' ? '⚪ Unpaid' : currentEmp.salaryState === 'Paid' ? '🟢 Paid' : '🔴 Stopped';
    const stateLabelTo = nextState === 'Not Yet' ? '⚪ Unpaid' : nextState === 'Paid' ? `🟢 Paid (${formattedDate})` : '🔴 Stopped (Salary Withheld)';

    const changeEntry: AuditLogChange = {
      field: 'Salary State',
      from: stateLabelFrom,
      to: stateLabelTo,
    };

    const badgeColor = nextState === 'Paid'
      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
      : nextState === 'Stopped'
        ? 'bg-rose-50 text-rose-800 border border-rose-200'
        : 'bg-slate-100 text-slate-700 border border-slate-200';

    addAuditLog(
      isArchivedCycle ? `Historical Disbursement Status Changed [${activePeriod.name}]` : 'Salary Disbursement Status Changed',
      `${isArchivedCycle ? `[HISTORICAL ARCHIVE: ${activePeriod.name}] ` : ''}Modified payout status for ${currentEmp.name} (${id}) from ${stateLabelFrom} ➔ ${stateLabelTo}. Net Payout: ${currSym}${currentEmp.netSalary.toLocaleString()}.`,
      nextState === 'Paid' ? 'check_circle' : nextState === 'Stopped' ? 'block' : 'radio_button_unchecked',
      {
        employeeId: id,
        employeeName: currentEmp.name,
        category: 'Salary',
        changes: [changeEntry],
        badgeColor: isArchivedCycle ? 'bg-amber-50 text-amber-800 border border-amber-200' : badgeColor,
      }
    );

    showToast(
      isArchivedCycle ? 'Historical Record Updated' : 'Disbursement Status Changed',
      `${currentEmp.name} marked as ${nextState}.${isArchivedCycle ? ` Audited for ${activePeriod.name}.` : ''}`
    );
  };

  const deleteEmployee = (id: string) => {
    const currentEmp = employees.find((e) => e.id === id);
    if (!currentEmp) return;

    const isArchivedCycle = activePeriod.status === 'Archived';

    setEmployees((prev) => {
      const updatedList = prev.filter((e) => e.id !== id);
      setPeriodEmployeesMap((m) => ({ ...m, [activePeriodId]: updatedList }));
      return updatedList;
    });

    const currSym = currentEmp.isForeign ? '$' : 'IQD ';
    addAuditLog(
      isArchivedCycle ? `Historical Record Deleted [${activePeriod.name}]` : 'Employee Permanently Deleted',
      `${isArchivedCycle ? `[HISTORICAL ARCHIVE: ${activePeriod.name}] ` : ''}Removed ${currentEmp.name} (${id}) from ${currentEmp.department}. Base Salary: ${currSym}${currentEmp.baseSalary.toLocaleString()}, Net: ${currSym}${currentEmp.netSalary.toLocaleString()}, Status: ${currentEmp.salaryState}.`,
      'delete_forever',
      {
        employeeId: id,
        employeeName: currentEmp.name,
        category: 'Employee',
        changes: [{ field: 'Account Status', from: 'Active Ledger Record', to: 'Permanently Deleted' }],
        badgeColor: 'bg-rose-100 text-rose-800 border border-rose-300',
      }
    );
    showToast('Employee Deleted', `${currentEmp.name} removed from roster.`, 'error');
  };

  const importEmployees = (importedEmployees: Employee[], fileName: string) => {
    const currentUsdRate = settings?.usdToDinarRate || 1310;
    // Process base salary scaling for local and recalculate net salary
    const processedEmployees = importedEmployees.map((emp) => {
      const isForeign = Boolean(emp.isForeign);
      let baseSalary = Number(String(emp.baseSalary).replace(/[$€£¥,]/g, '').trim()) || 0;
      // Rule: If Local employee and base salary is < 20,000, multiply by 1000
      if (!isForeign && baseSalary > 0 && baseSalary < 20000) {
        baseSalary = baseSalary * 1000;
      }

      const processAmount = (valInput: number | string): number => {
        const str = String(valInput || '').trim();
        const isExplicitDollar = str.includes('$') || /usd/i.test(str);
        const sanitized = str.replace(/[$€£¥,]/g, '').replace(/(usd|iqd|dinar)/gi, '').trim();
        let val = parseFloat(sanitized) || 0;
        if (val <= 0) return 0;

        if (!isForeign) {
          if (val > 0 && val < 1000) {
            val = val * 1000;
          }
          return val;
        } else {
          if (isExplicitDollar) {
            return val;
          }
          let dinarVal = val;
          if (dinarVal > 0 && dinarVal < 1000) {
            dinarVal = dinarVal * 1000;
          }
          return Math.round((dinarVal / currentUsdRate) * 100) / 100;
        }
      };

      const searchingDocFee = processAmount(emp.searchingDocFee || 0);
      const bonus = processAmount(emp.bonus || 0);
      const insurance = processAmount(emp.insurance || 0);
      const absenceDeduction = processAmount(emp.absenceDeduction || 0);
      const hasRecruitmentFee = Boolean(emp.hasRecruitmentFee);
      const recruitmentFee = hasRecruitmentFee ? baseSalary * 0.05 : 0;
      const netSalary = Math.max(0, (baseSalary - recruitmentFee) + bonus - insurance - absenceDeduction - searchingDocFee);

      // Rule: If base salary is 0 or non-numeric, salaryState is Stopped
      let salaryState = emp.salaryState || 'Not Yet';
      if (baseSalary <= 0) {
        salaryState = 'Stopped';
      }

      return {
        ...emp,
        baseSalary,
        bonus,
        insurance,
        searchingDocFee,
        absenceDeduction,
        recruitmentFee,
        netSalary,
        salaryState,
      };
    });

    setEmployees((prev) => {
      const existingIds = new Set(processedEmployees.map((e) => e.id));
      const kept = prev.filter((e) => !existingIds.has(e.id));
      const combined = [...processedEmployees, ...kept];
      setPeriodEmployeesMap((m) => ({ ...m, [activePeriodId]: combined }));
      return combined;
    });

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newId = `IMP-${Date.now().toString().slice(-4)}`;
    const newRecord: ExcelImportRecord = {
      id: newId,
      fileName,
      type: 'Employee Rosters',
      status: 'Success',
      recordsCount: importedEmployees.length,
      errorCount: 0,
      importedBy: 'Aziz Sulaiman',
      date: formattedDate,
    };

    setImports((prev) => [newRecord, ...prev]);

    addAuditLog(
      'Excel Batch Ingestion Completed',
      `Imported ${importedEmployees.length} employee records from "${fileName}" into cycle "${activePeriod.name}".`,
      'upload_file',
      {
        category: 'Import',
        badgeColor: 'bg-primary/10 text-primary',
        changes: [
          { field: 'Records Ingested', from: '0', to: `${importedEmployees.length} Records` },
          { field: 'Target Cycle', from: 'None', to: activePeriod.name },
          { field: 'Source File', from: 'None', to: fileName },
        ],
      }
    );

    showToast('Batch Import Completed', `Successfully ingested ${importedEmployees.length} records into ${activePeriod.name}.`);
  };

  const addImportRecord = (record: Omit<ExcelImportRecord, 'id'>) => {
    const id = `IMP-${Date.now().toString().slice(-4)}`;
    const newRec: ExcelImportRecord = { ...record, id };
    setImports((prev) => [newRec, ...prev]);
    addAuditLog(
      'Excel File Imported',
      `Imported ${record.fileName} containing ${record.recordsCount} rows (${record.type}).`,
      'upload_file'
    );
    showToast('Excel Data Imported', `Successfully processed ${record.recordsCount} records from ${record.fileName}!`);
  };

  const deleteImportRecord = (id: string) => {
    setImports((prev) => prev.filter((i) => i.id !== id));
    showToast('Import Record Deleted', 'Cleared batch entry from recent imports.', 'info');
  };

  const clearImports = () => {
    setImports([]);
    showToast('Import History Cleared', 'All batch import records cleared.', 'info');
  };

  const updateSettings = (updates: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    addAuditLog('Configuration Changed', 'Updated system preferences and toggle states.', 'settings');
    showToast('Settings Saved', 'System configurations have been updated successfully.');
  };

  const addDynamicField = (field: { name: string; type: string }) => {
    const id = `df-${Date.now()}`;
    setSettings((prev) => ({
      ...prev,
      dynamicFields: [...prev.dynamicFields, { id, ...field }],
    }));
    addAuditLog('Custom Field Added', `Added dynamic schema field "${field.name}" (${field.type}).`, 'dataset');
    showToast('Field Added', `Custom mapping field "${field.name}" is now available.`);
  };

  const removeDynamicField = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      dynamicFields: prev.dynamicFields.filter((f) => f.id !== id),
    }));
    showToast('Field Removed', 'Dynamic field definition was deleted.', 'info');
  };

  const addAdminUser = (user: { name: string; email: string; role: string }) => {
    const initials = user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const id = `u-${Date.now()}`;
    setSettings((prev) => ({
      ...prev,
      adminUsers: [
        ...prev.adminUsers,
        { id, name: user.name, initials, email: user.email, role: user.role, status: 'Active' },
      ],
    }));
    addAuditLog('Admin Invited', `Sent invitation to ${user.name} (${user.email}) as ${user.role}.`, 'person_add');
    showToast('User Invited', `Invitation dispatched to ${user.email}.`);
  };

  return (
    <PayrollContext.Provider
      value={{
        periods,
        activePeriod,
        setActivePeriodId,
        addPeriod,
        updatePeriodStatus,
        archivePeriod,
        reopenPeriod,
        employees,
        periodEmployeesMap,
        addEmployee,
        updateEmployee,
        toggleSalaryState,
        deleteEmployee,
        importEmployees,
        imports,
        addImportRecord,
        deleteImportRecord,
        clearImports,
        auditLogs,
        addAuditLog,
        settings,
        updateSettings,
        addDynamicField,
        removeDynamicField,
        addAdminUser,
        isNewRunModalOpen,
        setIsNewRunModalOpen,
        isAddEmployeeModalOpen,
        setIsAddEmployeeModalOpen,
        sidebarFrozen,
        setSidebarFrozen,
        toggleSidebarFrozen,
        sidebarCollapsed,
        setSidebarCollapsed,
        sidebarHidden,
        setSidebarHidden,
        sidebarPinned,
        setSidebarPinned,
        toggleSidebarCollapse,
        toggleSidebarHide,
        toggleSidebarPin,
        toasts,
        showToast,
        dismissToast,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </PayrollContext.Provider>
  );
}

export function usePayroll() {
  const context = useContext(PayrollContext);
  if (!context) {
    throw new Error('usePayroll must be used within a PayrollProvider');
  }
  return context;
}
