import {
  PayrollPeriod,
  Employee,
  ReportSummary,
  SystemSettings,
  UserProfile,
  ImportHistoryItem,
  AuditLogEvent,
  DynamicField,
  FieldDataType,
  AdminUser,
} from '../types';

let BASE_URL = localStorage.getItem('payroll_api_url') || 'http://127.0.0.1:8080';
let authToken: string | null = localStorage.getItem('payroll_access_token');
let refreshToken: string | null = localStorage.getItem('payroll_refresh_token');

export const getApiUrl = () => BASE_URL;
export const setApiUrl = (url: string) => {
  BASE_URL = url.trim().replace(/\/+$/, '');
  localStorage.setItem('payroll_api_url', BASE_URL);
};

type SessionTerminatedListener = (message: string) => void;
const sessionTerminatedListeners: SessionTerminatedListener[] = [];

export const onSessionTerminated = (callback: SessionTerminatedListener) => {
  sessionTerminatedListeners.push(callback);
  return () => {
    const idx = sessionTerminatedListeners.indexOf(callback);
    if (idx !== -1) sessionTerminatedListeners.splice(idx, 1);
  };
};

export const triggerSessionTerminated = (msg = 'You have been logged in from another device.') => {
  clearAuthTokens();
  sessionTerminatedListeners.forEach((fn) => {
    try {
      fn(msg);
    } catch {
      // ignore
    }
  });
};

export const clearAuthTokens = () => {
  authToken = null;
  refreshToken = null;
  localStorage.removeItem('payroll_access_token');
  localStorage.removeItem('payroll_refresh_token');
  localStorage.removeItem('payroll_is_logged_in');
};

// Generic authenticated HTTP request
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as any) || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    if (res.status === 401) {
      // Inspect headers & body to detect if another device took over the session
      const sessionHeader = res.headers.get('x-session-status');
      let errorBody: any = null;
      try {
        errorBody = await res.clone().json();
      } catch {
        // ignore
      }

      const isConflict =
        sessionHeader === 'TERMINATED_BY_ANOTHER_DEVICE' ||
        errorBody?.code === 'DEVICE_SESSION_TERMINATED' ||
        (errorBody?.message && errorBody.message.toLowerCase().includes('another device'));

      if (isConflict) {
        triggerSessionTerminated(errorBody?.message || 'You have been logged in from another device.');
        throw new Error('DEVICE_SESSION_TERMINATED: You have been logged in from another device.');
      }

      // Attempt automatic refresh if ordinary 401 Unauthorized and refresh token exists
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          const refreshSessionHeader = refreshRes.headers.get('x-session-status');
          let refreshErrorBody: any = null;
          try {
            refreshErrorBody = await refreshRes.clone().json();
          } catch {
            // ignore
          }

          if (
            refreshSessionHeader === 'TERMINATED_BY_ANOTHER_DEVICE' ||
            refreshErrorBody?.code === 'DEVICE_SESSION_TERMINATED' ||
            (refreshErrorBody?.message && refreshErrorBody.message.toLowerCase().includes('another device'))
          ) {
            triggerSessionTerminated(refreshErrorBody?.message || 'You have been logged in from another device.');
            throw new Error('DEVICE_SESSION_TERMINATED: You have been logged in from another device.');
          }

          if (refreshRes.ok && refreshErrorBody) {
            const tokenJson = refreshErrorBody;
            const newTok = tokenJson.data?.accessToken || tokenJson.accessToken;
            if (newTok) {
              authToken = newTok;
              localStorage.setItem('payroll_access_token', newTok);
              headers['Authorization'] = `Bearer ${newTok}`;
              const retryRes = await fetch(`${BASE_URL}${path}`, {
                ...options,
                headers,
              });
              if (retryRes.ok) {
                const retryJson = await retryRes.json();
                return (retryJson.data !== undefined ? retryJson.data : retryJson) as T;
              }
            }
          }
        } catch (e: any) {
          if (e?.message?.includes('DEVICE_SESSION_TERMINATED')) {
            throw e;
          }
        }
      }
    }
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  return (json.data !== undefined ? json.data : json) as T;
}

export const DEFAULT_SYSTEM_FIELDS: DynamicField[] = [
  { id: 'f-id', name: 'Employee ID', key: 'code', type: 'Alphanumeric', required: true, system: true, excelHeader: 'ت' },
  { id: 'f-name', name: 'Employee Name', key: 'name', type: 'Alphanumeric', required: true, system: true, excelHeader: 'الاسم' },
  { id: 'f-dept', name: 'Department', key: 'department', type: 'Alphanumeric', required: true, system: true, excelHeader: 'القسم' },
  { id: 'f-foreign', name: 'Foreign Staff (USD/IQD)', key: 'isForeign', type: 'Alphanumeric', required: false, system: false, excelHeader: 'اجنبي / محلي' },
  { id: 'f-base', name: 'Base Salary', key: 'baseSalary', type: 'Currency', required: true, system: true, excelHeader: 'الراتب' },
  { id: 'f-agency', name: 'Arrival Agency Fee (0.05)', key: 'arrivalFee', type: 'Alphanumeric', required: false, system: false, excelHeader: 'اجور الحضور (0.05)' },
  { id: 'f-bonus', name: 'Bonus', key: 'bonus', type: 'Currency', required: false, system: false, excelHeader: 'مخصصات' },
  { id: 'f-search', name: 'Search Fee', key: 'searchFee', type: 'Currency', required: false, system: false, excelHeader: 'بحث' },
  { id: 'f-ins', name: 'Insurance', key: 'insurance', type: 'Currency', required: false, system: false, excelHeader: 'ضمان' },
  { id: 'f-abs-days', name: 'Absence Days', key: 'absenceDays', type: 'Numeric', required: false, system: false, excelHeader: 'غياب' },
  { id: 'f-net', name: 'Net Salary', key: 'netSalary', type: 'Currency', required: true, system: true, excelHeader: 'صافي' },
  { id: 'f-state', name: 'Salary State', key: 'salaryState', type: 'Alphanumeric', required: false, system: false, excelHeader: 'الحالة' },
  { id: 'f-paid-date', name: 'Paid Date & Time', key: 'paidAt', type: 'Date', required: false, system: false, excelHeader: 'تاريخ الاستلام' },
];

const LOCAL_SETTINGS_KEY = 'payroll_system_settings';

export const normalizeField = (f: Partial<DynamicField>, idx: number): DynamicField => ({
  id: f.id || f.key || `f-${idx}-${Date.now()}`,
  name: f.name || (f as any).label || `Field ${idx + 1}`,
  key: f.key || `field_${idx}`,
  type: (f.type as FieldDataType) || 'Alphanumeric',
  required: Boolean(f.required),
  system: Boolean(f.system),
  excelHeader: f.excelHeader || ((f as any).excelAliases?.[0]) || '',
  description: f.description || '',
});

export const getCachedLocalSettings = (): SystemSettings => {
  const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const rawFields = Array.isArray(parsed.dynamicFields) && parsed.dynamicFields.length > 0
          ? parsed.dynamicFields
          : DEFAULT_SYSTEM_FIELDS;

        const normalizedFields = rawFields.map(normalizeField);

        return {
          institutionName: parsed.institutionName || 'University Administration',
          institutionCode: parsed.institutionCode || 'UNIV-IRQ-2026',
          defaultCurrency: parsed.defaultCurrency === 'USD' ? 'USD' : 'IQD',
          usdToIqdRate: Number(parsed.usdToIqdRate) || 1310,
          taxRegistrationNumber: parsed.taxRegistrationNumber || 'TRN-2026',
          fiscalYear: parsed.fiscalYear || '2026',
          payCycle: parsed.payCycle || 'MONTHLY',
          autoCalculateAllowances: parsed.autoCalculateAllowances ?? true,
          strictStatutoryDeductions: parsed.strictStatutoryDeductions ?? true,
          enableAuditLog: parsed.enableAuditLog ?? true,
          apiUrl: parsed.apiUrl || BASE_URL,
          dynamicFields: normalizedFields,
          adminUsers: parsed.adminUsers || [],
        };
      }
    } catch {
      // ignore
    }
  }

  return {
    institutionName: 'University Administration',
    institutionCode: 'UNIV-IRQ-2026',
    defaultCurrency: 'IQD',
    usdToIqdRate: 1310,
    taxRegistrationNumber: 'TRN-2026',
    fiscalYear: '2026',
    payCycle: 'MONTHLY',
    autoCalculateAllowances: true,
    strictStatutoryDeductions: true,
    enableAuditLog: true,
    apiUrl: BASE_URL,
    dynamicFields: DEFAULT_SYSTEM_FIELDS,
    adminUsers: [],
  };
};

export const cleanIqdFee = (val: any): number => {
  let num = typeof val === 'number' ? val : Number(String(val || '').replace(/[^0-9.-]/g, '')) || 0;
  if (num <= 0) return 0;
  // If inflated by repeated 1000x multiplication (e.g. 118,580,000,000 or 77,000,000)
  while (num > 10_000_000) {
    num /= 1000;
  }
  return Math.round(num * 100) / 100;
};

export const normalizeEmployeeData = (dto: any, exchangeRate?: number): Employee => {
  const isPaid =
    (dto.salaryState || dto.paymentStatus || '').toLowerCase().includes('paid') &&
    !(dto.salaryState || '').toLowerCase().includes('not');
  const isStopped =
    (dto.salaryState || dto.paymentStatus || '').toLowerCase().includes('stop') ||
    (typeof dto.baseSalary === 'number' && dto.baseSalary <= 0) ||
    dto.baseSalary === 0;

  // Detect Foreign ($ in baseSalary or explicit flag/currency)
  const rawBaseStr = String(dto.rawBaseSalary ?? dto.baseSalary ?? '');
  const hasDollar = rawBaseStr.includes('$');
  const isForeign =
    dto.isForeign === true ||
    dto.currency === 'USD' ||
    hasDollar ||
    (typeof dto.nationality === 'string' && dto.nationality.toLowerCase().includes('foreign'));
  const currency: 'USD' | 'IQD' = isForeign ? 'USD' : 'IQD';

  const cached = getCachedLocalSettings();
  const defaultRate = Number(cached.usdToIqdRate) || 1310;
  const rate = dto.exchangeRate || exchangeRate || defaultRate;

  // Rule 1: All baseSalary that don't have dollar sign and are less than 100,000 should multiply by 1,000
  const rawBaseNum = typeof dto.baseSalary === 'number'
    ? dto.baseSalary
    : Number(rawBaseStr.replace(/[^0-9.-]/g, '')) || 0;
  let baseSalary = rawBaseNum;
  if (!hasDollar && !isForeign && rawBaseNum > 0 && rawBaseNum < 100000) {
    baseSalary = rawBaseNum * 1000;
  }

  // Bonus
  const rawBonusNum = typeof dto.bonus === 'number'
    ? dto.bonus
    : Number(String(dto.bonus || '').replace(/[^0-9.-]/g, '')) || 0;
  const bonus = (!isForeign && rawBonusNum > 0 && rawBonusNum < 1000) ? rawBonusNum * 1000 : rawBonusNum;

  // Search Fee & Insurance Conversion for foreign vs local
  const rawSearchVal = cleanIqdFee(dto.searchingDocFeeIqd || dto.searchingDocFee || dto.searchFee);
  let searchFee = 0;
  let searchFeeIqd = 0;
  if (rawSearchVal > 0) {
    if (isForeign) {
      if (rawSearchVal >= 500) {
        // Given in IQD (standard for Iraqi payroll search fee) -> convert to USD
        searchFeeIqd = rawSearchVal;
        searchFee = Math.round((rawSearchVal / rate) * 100.0) / 100.0;
      } else {
        // Already in USD
        searchFee = rawSearchVal;
        searchFeeIqd = Math.round(rawSearchVal * rate);
      }
    } else {
      searchFee = (rawSearchVal < 1000 && rawSearchVal > 0) ? rawSearchVal * 1000 : rawSearchVal;
      searchFeeIqd = searchFee;
    }
  }

  const rawInsVal = cleanIqdFee(dto.insurance);
  let insurance = 0;
  let insuranceIqd = 0;
  if (rawInsVal > 0) {
    if (isForeign) {
      if (rawInsVal >= 500) {
        // Given in IQD -> convert to USD
        insuranceIqd = rawInsVal;
        insurance = Math.round((rawInsVal / rate) * 100.0) / 100.0;
      } else {
        insurance = rawInsVal;
        insuranceIqd = Math.round(rawInsVal * rate);
      }
    } else {
      insurance = (rawInsVal < 1000 && rawInsVal > 0) ? rawInsVal * 1000 : rawInsVal;
      insuranceIqd = insurance;
    }
  }

  // Absence Days & Deduction
  const absenceDays = Math.max(0, Number(dto.absenceDays ?? dto.absence_days) || 0);
  const rawAbsDed = typeof dto.absenceDeduction === 'number'
    ? dto.absenceDeduction
    : (typeof dto.absence === 'number' ? dto.absence : Number(String(dto.absence || dto.absenceDeduction || '').replace(/[^0-9.-]/g, '')) || 0);
  const absence = absenceDays > 0 && baseSalary > 0
    ? Math.round((baseSalary / 30.0 * absenceDays) * 100.0) / 100.0
    : ((!isForeign && rawAbsDed > 0 && rawAbsDed < 1000) ? rawAbsDed * 1000 : Math.max(0, rawAbsDed));

  // Arrival fee: ONLY enable if Base Salary has "$" dollar sign or currency is USD with arrival active
  let arrivalFee = 0;
  if (hasDollar || (isForeign && (dto.hasRecruitmentFee || dto.arrivalFeeActive || (dto.recruitmentFee && dto.recruitmentFee > 0)))) {
    arrivalFee = Math.round(baseSalary * 0.05 * 100.0) / 100.0;
  }

  const netSalary = isForeign
    ? Math.max(0, Math.round(((baseSalary - arrivalFee) + bonus - insurance - searchFee - absence) * 100.0) / 100.0)
    : Math.max(0, Math.round((baseSalary - arrivalFee) + bonus - insurance - searchFee - absence));

  return {
    id: dto.id,
    employeeCode: dto.id,
    nationalId: dto.phone || dto.id,
    fullName: dto.name || dto.fullName || 'Staff Member',
    department: dto.department || 'General Faculty',
    position: dto.type || dto.position || 'Academic Staff',
    baseSalary,
    arrivalFee,
    bonus,
    insurance,
    insuranceIqd,
    absence,
    absenceDays,
    searchFee,
    searchFeeIqd,
    allowances: bonus,
    deductions: insurance + searchFee + absence + arrivalFee,
    netSalary,
    currency,
    isForeign,
    status: (dto.status || 'ACTIVE').toUpperCase() as any,
    paymentStatus: (isStopped || baseSalary <= 0) ? 'STOPPED' : isPaid ? 'PAID' : 'UNPAID',
    paidAt: dto.paidAt,
    paidBy: dto.paidBy,
    periodId: dto.periodId,
    sheetSource: dto.department,
  };
};

export const api = {
  // Probes backend health across /health, /, and /api/health
  checkHealth: async (): Promise<{ online: boolean; version?: string; status?: string }> => {
    const endpointsToTry = ['/health', '/', '/api/health'];

    for (const ep of endpointsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${BASE_URL}${ep}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          try {
            const data = await res.json();
            return {
              online: true,
              version: data.version || '1.0.0',
              status: data.status || 'UP',
            };
          } catch {
            return { online: true, version: '1.0.0', status: 'UP' };
          }
        }
      } catch {
        // try next
      }
    }

    return { online: false };
  },

  // Active session probe to detect when another device signs in with the same credentials
  checkSession: async (): Promise<{ active: boolean; conflict?: boolean; message?: string }> => {
    if (!authToken) return { active: false };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${BASE_URL}/api/auth/session-status`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return { active: true };
      }

      // Check if unauthorized due to device conflict
      const sessionHeader = res.headers.get('x-session-status');
      let errorBody: any = null;
      try {
        errorBody = await res.json();
      } catch {
        // ignore
      }

      const isConflict =
        sessionHeader === 'TERMINATED_BY_ANOTHER_DEVICE' ||
        errorBody?.code === 'DEVICE_SESSION_TERMINATED' ||
        (errorBody?.message && errorBody.message.toLowerCase().includes('another device'));

      if (isConflict) {
        const msg = errorBody?.message || 'You have been logged in from another device.';
        triggerSessionTerminated(msg);
        return { active: false, conflict: true, message: msg };
      }

      return { active: false };
    } catch {
      // Network timeout/drop - do not prematurely terminate session
      return { active: true };
    }
  },

  login: async (email: string, pass: string): Promise<UserProfile> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.message || `Authentication failed with status ${res.status}`);
    }

    const json = await res.json();
    const payload = json.data || json;
    const token = payload.accessToken || payload.token;

    if (token) {
      authToken = token;
      localStorage.setItem('payroll_access_token', token);
    }
    if (payload.refreshToken) {
      refreshToken = payload.refreshToken;
      localStorage.setItem('payroll_refresh_token', payload.refreshToken);
    }

    const userObj = payload.user || payload;
    return {
      id: userObj.id || 'usr-1',
      name: userObj.fullName || userObj.name || email.split('@')[0],
      email: userObj.email || email,
      role: userObj.role || 'Admin',
      department: userObj.department || 'Payroll Division',
      avatarUrl: userObj.avatarUrl,
    };
  },

  getPeriods: async (): Promise<PayrollPeriod[]> => {
    try {
      const res: any = await request('/api/periods?pageSize=100');
      const list = Array.isArray(res) ? res : res?.items || [];
      const cached = getCachedLocalSettings();
      const currentRate = Number(cached.usdToIqdRate) || 1310;
      return list.map((dto: any) => ({
        id: dto.id,
        code: dto.ref || dto.code || dto.id,
        name: dto.name,
        startDate: dto.month ? `2026-${dto.month}-01` : '2026-08-01',
        endDate: dto.month ? `2026-${dto.month}-30` : '2026-08-31',
        payDate: dto.createdOn || dto.createdAt || '2026-08-28',
        status: (dto.status || 'OPEN').toUpperCase() as any,
        totalGross: dto.totalPayroll || 0,
        totalNet: dto.paidAmount || dto.totalPayroll || 0,
        totalDeductions: dto.remainingAmount || 0,
        employeeCount: dto.employeesCount || 0,
        currency: 'IQD',
        exchangeRate: dto.exchangeRate ? Number(dto.exchangeRate) : currentRate,
        createdAt: dto.createdAt,
      }));
    } catch {
      return [];
    }
  },

  createPeriod: async (period: Partial<PayrollPeriod>): Promise<PayrollPeriod> => {
    const payload = {
      name: period.name,
      ref: period.code,
      status: period.status || 'Active',
      month: period.code?.replace('PR-', '').split('-')[1] || 'AUG',
      year: 2026,
    };
    const res: any = await request('/api/periods', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const cached = getCachedLocalSettings();
    const currentRate = Number(cached.usdToIqdRate) || 1310;
    return {
      id: res.id,
      code: res.ref || res.id,
      name: res.name,
      startDate: `${res.year}-01-01`,
      endDate: `${res.year}-12-31`,
      payDate: res.createdOn || new Date().toISOString().slice(0, 10),
      status: (res.status || 'OPEN').toUpperCase() as any,
      totalGross: res.totalPayroll || 0,
      totalNet: res.paidAmount || 0,
      totalDeductions: res.remainingAmount || 0,
      employeeCount: res.employeesCount || 0,
      currency: 'IQD',
      exchangeRate: period.exchangeRate || currentRate,
    };
  },

  recalculatePeriod: async (periodId: string): Promise<PayrollPeriod> => {
    const res: any = await request(`/api/periods/${periodId}/recalculate`, { method: 'POST' });
    return res;
  },

  closePeriod: async (periodId: string): Promise<PayrollPeriod> => {
    const res: any = await request(`/api/periods/${periodId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ARCHIVED' }),
    });
    return res;
  },

  activatePeriod: async (periodId: string): Promise<PayrollPeriod> => {
    const res: any = await request(`/api/periods/${periodId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'OPEN' }),
    });
    return res;
  },

  updatePeriod: async (periodId: string, updated: Partial<PayrollPeriod>): Promise<PayrollPeriod> => {
    const payload: any = {};
    if (updated.name !== undefined) payload.name = updated.name;
    if (updated.code !== undefined) payload.ref = updated.code;
    if (updated.status !== undefined) payload.status = updated.status;
    if (updated.exchangeRate !== undefined) payload.exchangeRate = updated.exchangeRate;
    const res: any = await request(`/api/periods/${periodId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res;
  },

  deletePeriod: async (periodId: string): Promise<boolean> => {
    const res: any = await request(`/api/periods/${periodId}`, {
      method: 'DELETE',
    });
    return res?.success ?? true;
  },

  getEmployees: async (periodId?: string): Promise<Employee[]> => {
    try {
      const url = periodId
        ? `/api/employees?periodId=${periodId}&pageSize=1000`
        : '/api/employees?pageSize=1000';
      const res: any = await request(url);
      const list = Array.isArray(res) ? res : res?.items || [];
      return list.map((dto: any) => normalizeEmployeeData(dto));
    } catch {
      return [];
    }
  },

  createEmployee: async (emp: Partial<Employee>): Promise<Employee> => {
    const payload = {
      periodId: emp.periodId || 'prd-1',
      name: emp.fullName,
      department: emp.department || 'Operations',
      baseSalary: emp.baseSalary || 0,
      bonus: emp.bonus || 0,
      insurance: emp.insurance || 0,
      absenceDays: emp.absenceDays || 0,
      absenceDeduction: (emp.absenceDays || 0) > 0 && (emp.baseSalary || 0) > 0
        ? Math.round(((emp.baseSalary || 0) / 30.0 * (emp.absenceDays || 0)) * 100.0) / 100.0
        : (emp.absence || 0),
      searchingDocFee: emp.searchFee || 0,
      recruitmentFee: emp.arrivalFee || 0,
      type: emp.position || 'Full-Time',
      status: 'Active',
      isForeign: emp.currency === 'USD' || emp.isForeign,
      currency: emp.currency || 'IQD',
      paymentStatus: emp.paymentStatus || 'Unpaid',
      salaryState: emp.paymentStatus === 'PAID' ? 'Paid' : emp.paymentStatus === 'STOPPED' ? 'Stopped' : 'Not Yet',
    };
    const res: any = await request('/api/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeEmployeeData(res);
  },

  updateEmployee: async (id: string, emp: Partial<Employee>): Promise<Employee> => {
    const isForeign = emp.currency === 'USD' || emp.isForeign === true;
    const absDays = emp.absenceDays !== undefined ? emp.absenceDays : 0;
    const baseSal = emp.baseSalary || 0;
    const absDed = absDays > 0 && baseSal > 0
      ? Math.round((baseSal / 30.0 * absDays) * 100.0) / 100.0
      : emp.absence;

    const payload: any = {
      name: emp.fullName,
      department: emp.department,
      baseSalary: emp.baseSalary,
      bonus: emp.bonus,
      insurance: emp.insurance,
      absenceDays: absDays,
      absenceDeduction: absDed,
      searchingDocFee: emp.searchFee,
      recruitmentFee: emp.arrivalFee,
      hasRecruitmentFee: (emp.arrivalFee || 0) > 0,
      isForeign,
      currency: isForeign ? 'USD' : 'IQD',
      salaryState: emp.paymentStatus === 'PAID' ? 'Paid' : emp.paymentStatus === 'STOPPED' ? 'Stopped' : 'Not Yet',
      paymentStatus: emp.paymentStatus === 'PAID' ? 'Paid' : emp.paymentStatus === 'STOPPED' ? 'Stopped' : 'Unpaid',
      paidAt: emp.paidAt,
    };
    try {
      const res: any = await request(`/api/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return normalizeEmployeeData(res);
    } catch {
      return normalizeEmployeeData({ ...emp, id });
    }
  },

  updateEmployeeStatus: async (id: string, state: 'Paid' | 'Not Yet' | 'Stopped', paidBy?: string): Promise<any> => {
    return request(`/api/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        salaryState: state,
        paymentStatus: state === 'Paid' ? 'Paid' : state === 'Stopped' ? 'Stopped' : 'Unpaid',
        paidAt: state === 'Paid' ? new Date().toISOString().replace('T', ' ').slice(0, 16) : null,
        ...(paidBy ? { paidBy } : {}),
      }),
    });
  },

  deleteEmployee: async (id: string): Promise<{ success: boolean }> => {
    return request(`/api/employees/${id}`, { method: 'DELETE' });
  },

  getReportsSummary: async (periodId?: string): Promise<ReportSummary | null> => {
    if (!periodId) return null;
    try {
      const res: any = await request(`/api/reports/summary?periodId=${periodId}`);
      if (!res) return null;
      return {
        periodId: res.periodId || periodId,
        periodName: res.periodName || 'Active Cycle',
        totalGross: res.totalPayroll || 0,
        totalNet: res.paidAmount || 0,
        totalDeductions: res.totalDeductions || 0,
        totalTaxes: res.totalInsurance || 0,
        employerTaxes: 0,
        employeeCount: res.employeeCount || 0,
        departmentBreakdown: (res.departments || []).map((d: any) => ({
          department: d.department,
          employeeCount: d.employeeCount || 0,
          totalGross: d.totalAmount || 0,
          totalNet: d.totalAmount || 0,
          percentage: d.percentage || 0,
        })),
        currencyBreakdown: [],
      };
    } catch {
      return null;
    }
  },

  getAuditLogs: async (): Promise<AuditLogEvent[]> => {
    try {
      const res: any = await request('/api/audit-logs?pageSize=100');
      const list = Array.isArray(res) ? res : res?.items || [];
      return list.map((item: any) => ({
        id: item.id,
        title: item.action || 'System Action',
        timestamp: item.createdAt || new Date().toISOString(),
        timeDisplay: item.time || item.createdAt?.slice(11, 16) || 'Just now',
        actorName: item.user || 'System',
        actorId: 'OP-01',
        actorRole: 'Authorized Officer',
        category: (item.category || 'SYSTEM').toUpperCase() as any,
        summary: item.detail || '',
        badgeText: item.action,
        badgeType: 'info',
      }));
    } catch {
      return [];
    }
  },

  getSettings: async (): Promise<SystemSettings> => {
    const cached = getCachedLocalSettings();
    try {
      const res: any = await request('/api/settings');
      let dynamicFields: DynamicField[] = [];
      if (res.dynamicFieldsJson) {
        try {
          const parsed = JSON.parse(res.dynamicFieldsJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            dynamicFields = parsed.map(normalizeField);
          }
        } catch {
          // ignore
        }
      }

      if (!dynamicFields || dynamicFields.length === 0) {
        dynamicFields = cached.dynamicFields && cached.dynamicFields.length > 0
          ? cached.dynamicFields.map(normalizeField)
          : DEFAULT_SYSTEM_FIELDS;
      }

      const merged: SystemSettings = {
        institutionName: cached.institutionName || res.institutionName || 'University Administration',
        institutionCode: cached.institutionCode || res.institutionCode || 'UNIV-IRQ-2026',
        defaultCurrency: (cached.defaultCurrency || (res.defaultCurrency === 'USD' ? 'USD' : 'IQD')) as 'USD' | 'IQD',
        usdToIqdRate: Number(cached.usdToIqdRate) || (res.usdToDinarRate && res.usdToDinarRate > 1 ? Number(res.usdToDinarRate) : 1310),
        taxRegistrationNumber: 'TRN-2026',
        fiscalYear: cached.fiscalYear || res.fiscalYear || '2026',
        payCycle: 'MONTHLY',
        autoCalculateAllowances: true,
        strictStatutoryDeductions: true,
        enableAuditLog: true,
        apiUrl: BASE_URL,
        dynamicFields,
        adminUsers: cached.adminUsers || [],
      };

      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(merged));
      return merged;
    } catch {
      return cached;
    }
  },

  updateSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const cached = getCachedLocalSettings();
    const merged: SystemSettings = {
      ...cached,
      ...settings,
      defaultCurrency: settings.defaultCurrency || cached.defaultCurrency,
      usdToIqdRate: settings.usdToIqdRate || cached.usdToIqdRate,
      dynamicFields: Array.isArray(settings.dynamicFields)
        ? settings.dynamicFields.map(normalizeField)
        : cached.dynamicFields,
    };

    // 1. Immediately persist locally to ensure user changes are never lost
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(merged));

    // 2. Attempt to synchronize with backend API
    try {
      const payload: any = {
        institutionName: merged.institutionName,
        institutionCode: merged.institutionCode,
        defaultCurrency: merged.defaultCurrency,
        usdToDinarRate: merged.usdToIqdRate,
        fiscalYear: merged.fiscalYear,
      };
      if (merged.dynamicFields) {
        payload.dynamicFieldsJson = JSON.stringify(merged.dynamicFields);
      }
      await request('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      // Also try updating columns table on backend
      if (merged.dynamicFields && merged.dynamicFields.length > 0) {
        const columnDtos = merged.dynamicFields.map((f) => ({
          key: f.key,
          label: f.name,
          type: f.type,
          visible: true,
          required: f.required,
          excelAliases: f.excelHeader ? [f.excelHeader.toLowerCase()] : [],
        }));
        await request('/api/settings/columns', {
          method: 'PUT',
          body: JSON.stringify({ columns: columnDtos }),
        }).catch(() => {});
      }
    } catch {
      // Backend is offline or returned error; local state is preserved
    }

    return merged;
  },

  uploadExcelFile: async (
    file: File | Blob,
    periodId: string,
    fileName = 'university_roster.xlsx'
  ): Promise<{ importedCount: number; message: string }> => {
    const formData = new FormData();
    formData.append('file', file, fileName);

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${BASE_URL}/api/employees/upload-excel?periodId=${encodeURIComponent(periodId)}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `Upload failed with status ${res.status}`);
    }

    const json = await res.json();
    return json.data || json;
  },

  getImportHistory: async (): Promise<ImportHistoryItem[]> => {
    try {
      const res: any = await request('/api/imports?pageSize=50');
      const list = Array.isArray(res) ? res : res?.items || [];
      return list.map((item: any) => ({
        id: item.id,
        fileName: item.fileName,
        periodName: item.periodId || 'General',
        uploadedBy: item.importedBy || 'Admin',
        uploadDate: item.createdAt || new Date().toISOString(),
        recordCount: item.recordsCount || 0,
        successCount: (item.recordsCount || 0) - (item.errorCount || 0),
        status: (item.errorCount || 0) > 0 ? 'FAILED' : 'COMPLETED',
      }));
    } catch {
      return [];
    }
  },

  getUsers: async (): Promise<AdminUser[]> => {
    try {
      const res: any = await request('/api/users?pageSize=100');
      const list = Array.isArray(res) ? res : res?.items || [];
      const users: AdminUser[] = list.map((u: any) => ({
        id: u.id,
        name: u.name || 'User',
        email: u.email,
        role: u.role || 'Super Admin',
        status: u.status || 'Active',
        avatarUrl: u.avatar,
      }));
      const cached = getCachedLocalSettings();
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify({ ...cached, adminUsers: users }));
      return users;
    } catch {
      const cached = getCachedLocalSettings();
      return cached.adminUsers || [];
    }
  },

  createUser: async (user: { name: string; email: string; password?: string; role: string; status?: string }): Promise<AdminUser> => {
    const payload = {
      name: user.name,
      email: user.email,
      password: user.password || 'Officer@2026',
      role: user.role || 'Super Admin',
      status: user.status || 'Active',
    };
    const res: any = await request('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const created = res?.data || res;
    const newUser: AdminUser = {
      id: created.id || `usr-${Date.now()}`,
      name: created.name || user.name,
      email: created.email || user.email,
      role: created.role || user.role,
      status: created.status || user.status || 'Active',
      avatarUrl: created.avatar,
    };
    const cached = getCachedLocalSettings();
    const currentList = cached.adminUsers || [];
    const updatedList = [...currentList.filter((u) => u.id !== newUser.id && u.email !== newUser.email), newUser];
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify({ ...cached, adminUsers: updatedList }));
    return newUser;
  },

  updateUser: async (id: string, user: { name?: string; email?: string; password?: string; role?: string; status?: string }): Promise<AdminUser> => {
    const payload: any = {};
    if (user.name) payload.name = user.name;
    if (user.email) payload.email = user.email;
    if (user.password) payload.password = user.password;
    if (user.role) payload.role = user.role;
    if (user.status) payload.status = user.status;

    const res: any = await request(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    const updated = res?.data || res;
    const updatedUser: AdminUser = {
      id: updated.id || id,
      name: updated.name || user.name || '',
      email: updated.email || user.email || '',
      role: updated.role || user.role || 'Super Admin',
      status: updated.status || user.status || 'Active',
      avatarUrl: updated.avatar,
    };
    const cached = getCachedLocalSettings();
    const currentList = cached.adminUsers || [];
    const updatedList = currentList.map((u) => (u.id === id ? updatedUser : u));
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify({ ...cached, adminUsers: updatedList }));
    return updatedUser;
  },

  deleteUser: async (id: string): Promise<boolean> => {
    const res: any = await request(`/api/users/${id}`, {
      method: 'DELETE',
    });
    const cached = getCachedLocalSettings();
    const currentList = cached.adminUsers || [];
    const updatedList = currentList.filter((u) => u.id !== id);
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify({ ...cached, adminUsers: updatedList }));
    return res?.success ?? true;
  },
};

export const formatMoney = (
  amount: number,
  currency: 'IQD' | 'USD' = 'IQD',
  rate = 1310,
  options?: { convert?: boolean }
): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return currency === 'USD' ? '$ 0' : 'IQD 0';
  }

  if (currency === 'USD') {
    const val = options?.convert ? amount / (rate || 1310) : amount;
    return `$ ${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  } else {
    const val = Math.round(amount);
    return `IQD ${val.toLocaleString('en-US')}`;
  }
};
