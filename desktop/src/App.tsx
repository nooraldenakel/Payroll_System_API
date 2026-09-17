import React, { useState, useEffect, useCallback } from 'react';
import {
  PayrollPeriod,
  Employee,
  ReportSummary,
  SystemSettings,
  UserProfile,
  ImportHistoryItem,
  AuditLogEvent,
} from './types';
import { api, onSessionTerminated, clearAuthTokens } from './services/api';
import { Sidebar, TabKey } from './components/Sidebar';
import { Header } from './components/Header';
import { AddEmployeeModal } from './components/AddEmployeeModal';
import { CreatePeriodModal } from './components/CreatePeriodModal';
import { DeviceConflictModal } from './components/DeviceConflictModal';
import { ConfirmModal } from './components/ConfirmModal';
import { DashboardView } from './views/DashboardView';
import { PeriodsView } from './views/PeriodsView';
import { EmployeesView } from './views/EmployeesView';
import { ExcelImportView } from './views/ExcelImportView';
import { ReportsView } from './views/ReportsView';
import { AuditLogView } from './views/AuditLogView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';
import { StartupAnimation } from './components/StartupAnimation';

const INITIAL_USER: UserProfile = {
  id: '',
  name: 'Authorized Officer',
  email: '',
  role: 'Super Admin',
  department: 'Payroll Division',
};

const INITIAL_SETTINGS: SystemSettings = {
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
  apiUrl: 'http://127.0.0.1:8080',
  dynamicFields: [],
  adminUsers: [],
};

export const App: React.FC = () => {
  // Opening animation matching Folkd Dribbble shot
  const [showStartupAnimation, setShowStartupAnimation] = useState<boolean>(true);

  // Authentication State: Always displays Login Page & Connection Test first when opening the program
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [apiOnline, setApiOnline] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);

  // Core Data State - strictly populated from API
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [activePeriod, setActivePeriod] = useState<PayrollPeriod | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEvent[]>([]);
  const [, setIsLoadingData] = useState<boolean>(false);

  // Theme color state (Item 2)
  const [themeColor, setThemeColor] = useState<string>(() => {
    return localStorage.getItem('payroll_theme_color') || '#004d40';
  });

  // Cross-view department filter state (Item 15)
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('ALL');

  // Live Sync & Cross-Account Polling State (Item 20)
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState<boolean>(false);
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  // Single-device conflict state: pops up when another device signs in with same account
  const [deviceConflictOpen, setDeviceConflictOpen] = useState<boolean>(false);
  const [deviceConflictMessage, setDeviceConflictMessage] = useState<string>(
    'You have been logged in from another device.'
  );

  // Check Health & Ping API
  const checkApiHealth = useCallback(async () => {
    const health = await api.checkHealth();
    setApiOnline(health.online);
  }, []);

  // Sync Live Data (Item 20)
  const syncLiveData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [fetchedPeriods, fetchedSettings, fetchedImports, fetchedAudit] = await Promise.all([
        api.getPeriods(),
        api.getSettings(),
        api.getImportHistory(),
        api.getAuditLogs(),
      ]);
      setPeriods(fetchedPeriods);
      setSettings(fetchedSettings);
      setImportHistory(fetchedImports);
      setAuditLogs(fetchedAudit);

      const openPeriod = fetchedPeriods.find(
        (p) => (p.status || '').toUpperCase() === 'OPEN' || (p.status || '').toUpperCase() === 'ACTIVE'
      );
      const currentPeriodId = activePeriod?.id;
      const targetPeriod =
        (currentPeriodId ? fetchedPeriods.find((p) => p.id === currentPeriodId) : null) ||
        openPeriod ||
        fetchedPeriods.find((p) => (p.status || '').toUpperCase() !== 'ARCHIVED') ||
        fetchedPeriods[0] ||
        null;

      if (targetPeriod) {
        if (
          !activePeriod ||
          activePeriod.id !== targetPeriod.id ||
          activePeriod.status !== targetPeriod.status ||
          activePeriod.name !== targetPeriod.name
        ) {
          setActivePeriod(targetPeriod);
        }
        const [fetchedEmployees, fetchedReports] = await Promise.all([
          api.getEmployees(targetPeriod.id),
          api.getReportsSummary(targetPeriod.id),
        ]);
        setEmployees(fetchedEmployees);
        setReportSummary(fetchedReports);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsSyncing(false);
    }
  }, [activePeriod?.id, activePeriod?.status, activePeriod?.name]);

  // Initial Data Load strictly from API endpoints
  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      await checkApiHealth();

      const fetchedPeriods = await api.getPeriods();
      setPeriods(fetchedPeriods);
      const openPeriod = fetchedPeriods.find((p) => (p.status || '').toUpperCase() === 'OPEN' || (p.status || '').toUpperCase() === 'ACTIVE');
      const initialPeriod = openPeriod || fetchedPeriods.find((p) => (p.status || '').toUpperCase() !== 'ARCHIVED') || fetchedPeriods[0] || null;
      setActivePeriod(initialPeriod);

      const [fetchedEmployees, fetchedReports, fetchedSettings, fetchedImports, fetchedAudit] = await Promise.all([
        api.getEmployees(initialPeriod?.id),
        api.getReportsSummary(initialPeriod?.id),
        api.getSettings(),
        api.getImportHistory(),
        api.getAuditLogs(),
      ]);

      setEmployees(fetchedEmployees);
      setReportSummary(fetchedReports);
      setSettings(fetchedSettings);
      setImportHistory(fetchedImports);
      setAuditLogs(fetchedAudit);
    } finally {
      setIsLoadingData(false);
    }
  }, [checkApiHealth]);

  const handleSelectPeriod = async (period: PayrollPeriod) => {
    setActivePeriod(period);
    try {
      const [fetchedEmployees, fetchedReports] = await Promise.all([
        api.getEmployees(period.id),
        api.getReportsSummary(period.id),
      ]);
      setEmployees(fetchedEmployees);
      setReportSummary(fetchedReports);
    } catch {
      // Gracefully handle network hiccups
    }
  };

  // Quick Currency toggle from Header
  const handleToggleCurrency = async () => {
    const nextCurrency: 'USD' | 'IQD' = settings.defaultCurrency === 'IQD' ? 'USD' : 'IQD';
    const updated: SystemSettings = { ...settings, defaultCurrency: nextCurrency };
    setSettings(updated);
    try {
      await api.updateSettings({ defaultCurrency: nextCurrency });
    } catch (err) {
      console.error('Failed to sync currency to backend', err);
    }
  };

  // Listen for real-time session termination events triggered by any request
  useEffect(() => {
    const unsubscribe = onSessionTerminated((msg) => {
      setDeviceConflictMessage(msg || 'You have been logged in from another device.');
      setDeviceConflictOpen(true);
      setIsAuthenticated(false);
    });

    return unsubscribe;
  }, []);

  // Role Guard: Fiscal Auditor is strictly restricted to Dashboard and Staff Roster (Item 19)
  useEffect(() => {
    if (user.role === 'Fiscal Auditor') {
      if (activeTab !== 'dashboard' && activeTab !== 'employees') {
        setActiveTab('dashboard');
      }
    }
  }, [user.role, activeTab]);

  // When user becomes authenticated, immediately load initial periods and roster data from API
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Background polling for immediate cross-account synchronization every 7 seconds (Item 20)
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        syncLiveData();
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, syncLiveData]);

  const handleAcknowledgeConflict = () => {
    clearAuthTokens();
    setDeviceConflictOpen(false);
    setIsAuthenticated(false);
  };

  const handleLoginSuccess = (loggedInUser: UserProfile, isOffline: boolean) => {
    setUser(loggedInUser);
    setApiOnline(!isOffline);
    setDeviceConflictOpen(false);
    setIsAuthenticated(true);
  };

  const handleRequestLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogout = () => {
    clearAuthTokens();
    setIsAuthenticated(false);
    setActivePeriod(null);
    setPeriods([]);
    setEmployees([]);
    setReportSummary(null);
  };

  // Handle creating a new period
  const handleCreatePeriod = async (newPeriod: Partial<PayrollPeriod>) => {
    const created = await api.createPeriod(newPeriod);
    setPeriods((prev) => [created, ...prev]);
    setActivePeriod(created);
    setActiveTab('periods');

    const newAudit: AuditLogEvent = {
      id: `aud-${Date.now()}`,
      title: 'Initiate Fiscal Cycle',
      timestamp: new Date().toISOString(),
      timeDisplay: 'Just now',
      actorName: user.name,
      actorId: 'AUD-01',
      actorRole: user.role,
      category: 'SYSTEM',
      summary: `Created new institutional payroll run: ${created.name} (${created.code}).`,
      badgeText: 'Cycle Created',
      badgeType: 'success',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  // Handle adding an employee
  const handleAddEmployee = async (newEmp: Partial<Employee>) => {
    const created = await api.createEmployee({
      ...newEmp,
      periodId: activePeriod?.id,
    });
    setEmployees((prev) => [created, ...prev]);
    if (activePeriod) {
      setActivePeriod({
        ...activePeriod,
        employeeCount: (activePeriod.employeeCount || 0) + 1,
        totalNet: activePeriod.totalNet + created.netSalary,
        totalGross: activePeriod.totalGross + created.baseSalary + created.allowances,
      });
    }

    const newAudit: AuditLogEvent = {
      id: `aud-${Date.now()}`,
      title: 'Staff Member Enrolled',
      timestamp: new Date().toISOString(),
      timeDisplay: 'Just now',
      actorName: user.name,
      actorId: 'AUD-01',
      actorRole: user.role,
      category: 'SALARY',
      summary: `Enrolled ${created.fullName} (${created.employeeCode}) to ${created.department}. Base: ${settings.defaultCurrency} ${created.baseSalary.toLocaleString()}`,
      badgeText: 'Staff Added',
      badgeType: 'info',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  // Handle employee status change (Paid / Unpaid)
  const handleUpdateEmployeeStatus = (id: string, status: 'PAID' | 'UNPAID' | 'STOPPED') => {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;

    setEmployees((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              paymentStatus: status,
              paidAt: status === 'PAID' ? new Date().toISOString().replace('T', ' ').slice(0, 16) : undefined,
              paidBy: status === 'PAID' ? user.name : undefined,
            }
          : e
      )
    );

    const newAudit: AuditLogEvent = {
      id: `aud-${Date.now()}`,
      title: 'Salary Disbursement Status Changed',
      timestamp: new Date().toISOString(),
      timeDisplay: 'Just now',
      actorName: user.name,
      actorId: 'AUD-01',
      actorRole: user.role,
      category: 'DISBURSAL',
      summary: `Changed salary state for ${emp.fullName} (${emp.employeeCode}) from ${emp.paymentStatus} → ${status}. Net: ${settings.defaultCurrency} ${emp.netSalary.toLocaleString()}.`,
      previousValue: emp.paymentStatus,
      newValue: status,
      badgeText: status === 'PAID' ? 'Disbursed to Bank' : 'Pending Disbursal',
      badgeType: status === 'PAID' ? 'success' : 'warning',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  // Handle full employee update (compensation, currency, arrival fee)
  const handleUpdateEmployee = async (id: string, updated: Partial<Employee>) => {
    try {
      const saved = await api.updateEmployee(id, updated);
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...saved } : e)));
    } catch {
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
    }
  };

  // Handle deleting an employee
  const handleDeleteEmployee = async (id: string) => {
    await api.deleteEmployee(id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  // Handle batch deletion of employees (Item 15)
  const handleBatchDeleteEmployees = async (ids: string[]) => {
    for (const id of ids) {
      await api.deleteEmployee(id);
    }
    setEmployees((prev) => prev.filter((e) => !ids.includes(e.id)));
  };

  // Handle period recalculation
  const handleRecalculatePeriod = async (id: string) => {
    const recalculated = await api.recalculatePeriod(id);
    setPeriods((prev) => prev.map((p) => (p.id === id ? recalculated : p)));
    if (activePeriod?.id === id) {
      setActivePeriod(recalculated);
    }
  };

  // Handle period close (Archive - Item 6)
  const handleClosePeriod = async (id: string) => {
    const closed = await api.closePeriod(id);
    const updatedPeriods = periods.map((p) =>
      p.id === id ? { ...p, ...closed, status: 'ARCHIVED' as any } : p
    );
    setPeriods(updatedPeriods);

    if (activePeriod?.id === id) {
      // Find another active/open period
      const nextOpen = updatedPeriods.find((p) => p.id !== id && p.status === 'OPEN');
      if (nextOpen) {
        await handleSelectPeriod(nextOpen);
      } else {
        // Clear active period data immediately so archived data is not displayed
        setActivePeriod(null);
        setEmployees([]);
        setReportSummary(null);
      }
    }
  };

  // Handle period activation (Item 6)
  const handleActivatePeriod = async (id: string) => {
    await api.updatePeriod(id, { status: 'OPEN' });
    const refreshed = await api.getPeriods();
    setPeriods(refreshed);
    const activated = refreshed.find((p) => p.id === id);
    if (activated) {
      await handleSelectPeriod(activated);
    }
  };

  // Handle period update
  const handleUpdatePeriod = async (id: string, updated: Partial<PayrollPeriod>) => {
    try {
      const saved = await api.updatePeriod(id, updated);
      const refreshed = await api.getPeriods();
      setPeriods(refreshed);
      const matchingActive = refreshed.find((p) => p.id === (activePeriod?.id || id));
      if (matchingActive) {
        setActivePeriod(matchingActive);
      } else {
        setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated, ...saved } : p)));
        if (activePeriod?.id === id) {
          setActivePeriod((prev) => (prev ? { ...prev, ...updated, ...saved } : null));
        }
      }
    } catch {
      setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      if (activePeriod?.id === id) {
        setActivePeriod((prev) => (prev ? { ...prev, ...updated } : null));
      }
    }
  };

  // Handle archived period deletion (Item 6)
  const handleDeletePeriod = async (id: string) => {
    await api.deletePeriod(id);
    const remaining = periods.filter((p) => p.id !== id);
    setPeriods(remaining);
    if (activePeriod?.id === id) {
      const nextOpen = remaining.find((p) => p.status === 'OPEN');
      if (nextOpen) {
        await handleSelectPeriod(nextOpen);
      } else {
        setActivePeriod(null);
        setEmployees([]);
        setReportSummary(null);
      }
    }
    api.getAuditLogs().then(setAuditLogs);
  };

  // Handle import commit: strictly reload all live data from the API!
  const handleCommitImport = async (periodId: string, count: number) => {
    // 1. Reload live periods and employees from Ktor SQLite database
    const refreshedPeriods = await api.getPeriods();
    setPeriods(refreshedPeriods);

    const targetPeriod = refreshedPeriods.find((p) => p.id === periodId) || refreshedPeriods[0] || activePeriod;
    if (targetPeriod) {
      setActivePeriod(targetPeriod);
      const [refreshedEmployees, refreshedReports] = await Promise.all([
        api.getEmployees(targetPeriod.id),
        api.getReportsSummary(targetPeriod.id),
      ]);
      setEmployees(refreshedEmployees);
      setReportSummary(refreshedReports);
    }

    const newHistory: ImportHistoryItem = {
      id: `imp-${Date.now()}`,
      fileName: 'Workbook_Roster_Ingestion.xlsx',
      periodName: targetPeriod?.code || 'PR-2026-08',
      uploadedBy: user.name,
      uploadDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      recordCount: count,
      successCount: count,
      status: 'COMPLETED',
    };
    setImportHistory((prev) => [newHistory, ...prev]);

    const newAudit: AuditLogEvent = {
      id: `aud-${Date.now()}`,
      title: 'Batch Excel Ingestion Completed',
      timestamp: new Date().toISOString(),
      timeDisplay: 'Just now',
      actorName: user.name,
      actorId: 'AUD-01',
      actorRole: user.role,
      category: 'IMPORT',
      summary: `Ingested ${count} employee records from multi-sheet workbook into cycle ${targetPeriod?.code || 'PR-2026-08'}.`,
      badgeText: 'Workbook Ingested',
      badgeType: 'success',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  // CSV Export utility
  const handleExportCsv = () => {
    const headers = 'Employee Code,Full Name,Department,Position,Base Salary,Arrival (0.05),Bonus,Insurance,Absence,Search Fee,Net Salary,State,Paid At\n';
    const rows = employees
      .map(
        (e) =>
          `"${e.employeeCode}","${e.fullName}","${e.department}","${e.position}",${e.baseSalary},${e.arrivalFee || 0},${e.bonus || 0},${e.insurance || 0},${e.absence || 0},${e.searchFee || 0},${e.netSalary},"${e.paymentStatus}","${e.paidAt || 'Pending'}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Payroll_Ledger_${activePeriod?.code || 'PR-2026-08'}.csv`;
    link.click();
  };

  // Render startup animation first when opening the application
  if (showStartupAnimation) {
    return <StartupAnimation onComplete={() => setShowStartupAnimation(false)} />;
  }

  // If not authenticated, render Login Page & Connection Test first!
  if (!isAuthenticated) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <DeviceConflictModal
          isOpen={deviceConflictOpen}
          message={deviceConflictMessage}
          onAcknowledge={handleAcknowledgeConflict}
        />
      </>
    );
  }

  const pageTitles: Record<TabKey, string> = {
    dashboard: 'Payroll Overview',
    periods: 'Payroll Periods & Cycles',
    import: 'Direct Excel Workbook Ingestion',
    employees: 'Employee Management',
    reports: 'Payroll Financial Breakdown',
    audit: 'Audit Trail & Activity Log',
    settings: 'System Configuration',
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] text-slate-800 font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewPayrollRun={() => setIsCreatePeriodOpen(true)}
        onLogout={handleRequestLogout}
        themeColor={themeColor}
        userRole={user.role}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Sticky Top Header */}
        <Header
          pageTitle={pageTitles[activeTab]}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          apiOnline={apiOnline}
          onRefreshApi={checkApiHealth}
          user={user}
          recentEvents={auditLogs}
          currency={settings.defaultCurrency}
          rate={settings.usdToIqdRate}
          onToggleCurrency={handleToggleCurrency}
          onNavigateAudit={() => setActiveTab('audit')}
          onNavigateSettings={() => setActiveTab('settings')}
          onLogout={handleRequestLogout}
          onSyncData={syncLiveData}
          isSyncing={isSyncing}
        />

        {/* Dynamic Screen View with Smooth Page Open / Switch Animation */}
        <main className="flex-1 overflow-hidden flex flex-col relative">
          <div key={activeTab} className="flex-1 overflow-hidden flex flex-col animate-page-enter">
            {activeTab === 'dashboard' && (
            <DashboardView
              periods={periods}
              activePeriod={activePeriod}
              employees={employees}
              reportSummary={reportSummary}
              importHistory={importHistory}
              currency={settings.defaultCurrency}
              rate={settings.usdToIqdRate}
              onSelectPeriod={handleSelectPeriod}
              onNavigateTab={(tab, dept) => {
                if (dept) {
                  setSelectedDepartmentFilter(dept);
                }
                setActiveTab(tab);
              }}
              onExport={handleExportCsv}
            />
          )}

          {activeTab === 'periods' && (
            <PeriodsView
              periods={periods}
              activePeriod={activePeriod}
              currentUserEmail={user.email}
              currency={settings.defaultCurrency}
              rate={settings.usdToIqdRate}
              onSelectPeriod={handleSelectPeriod}
              onCreatePeriod={() => setIsCreatePeriodOpen(true)}
              onRecalculate={handleRecalculatePeriod}
              onClosePeriod={handleClosePeriod}
              onActivatePeriod={handleActivatePeriod}
              onUpdatePeriod={handleUpdatePeriod}
              onDeletePeriod={handleDeletePeriod}
              onViewRoster={(p) => {
                setActivePeriod(p);
                setActiveTab('employees');
              }}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              employees={employees}
              activePeriod={activePeriod}
              currency={settings.defaultCurrency}
              rate={settings.usdToIqdRate}
              onAddEmployee={() => setIsAddEmployeeOpen(true)}
              onDeleteEmployee={handleDeleteEmployee}
              onBatchDeleteEmployees={handleBatchDeleteEmployees}
              onUpdateEmployeeStatus={handleUpdateEmployeeStatus}
              onUpdateEmployee={handleUpdateEmployee}
              searchQuery={searchQuery}
              userRole={user.role}
              initialDepartmentFilter={selectedDepartmentFilter}
            />
          )}

          {activeTab === 'import' && (
            <ExcelImportView
              periods={periods}
              activePeriod={activePeriod}
              importHistory={importHistory}
              dynamicFields={settings.dynamicFields}
              onCommitImport={handleCommitImport}
              onNavigateTab={setActiveTab}
              systemRate={settings.usdToIqdRate}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              periods={periods}
              activePeriod={activePeriod}
              employees={employees}
              reportSummary={reportSummary}
              currency={settings.defaultCurrency}
              rate={settings.usdToIqdRate}
              onExportPdf={handleExportCsv}
              onExportExcel={handleExportCsv}
              onSelectPeriod={handleSelectPeriod}
            />
          )}

          {activeTab === 'audit' && (
            <AuditLogView
              auditLogs={auditLogs}
              onExportAudit={handleExportCsv}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={async (updated) => {
                const s = await api.updateSettings(updated);
                setSettings(s);
              }}
              apiOnline={apiOnline}
              onCheckApi={checkApiHealth}
              themeColor={themeColor}
              onThemeColorChange={setThemeColor}
              userRole={user.role}
            />
          )}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <AddEmployeeModal
        isOpen={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
        onSave={handleAddEmployee}
        periodId={activePeriod?.id}
      />

      <CreatePeriodModal
        isOpen={isCreatePeriodOpen}
        onClose={() => setIsCreatePeriodOpen(false)}
        onSave={handleCreatePeriod}
        rate={settings.usdToIqdRate}
      />

      <DeviceConflictModal
        isOpen={deviceConflictOpen}
        message={deviceConflictMessage}
        onAcknowledge={handleAcknowledgeConflict}
      />

      {/* Global Sign Out Clearance Modal */}
      {showLogoutConfirm && (
        <ConfirmModal
          isOpen={showLogoutConfirm}
          variant="warning"
          badgeLabel="Sign Out Clearance"
          title="Conclude Payroll Session"
          message="Are you sure you want to log out of Payroll Insight Pro? Any unsaved staging changes will be safely cancelled and you will return to the authorization gateway."
          confirmText="Sign Out"
          cancelText="Stay Signed In"
          onConfirm={() => {
            setShowLogoutConfirm(false);
            handleLogout();
          }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  );
};
