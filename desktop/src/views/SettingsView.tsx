import React, { useState, useEffect } from 'react';
import { SystemSettings, DynamicField, AdminUser, FieldDataType } from '../types';
import { getApiUrl, setApiUrl, DEFAULT_SYSTEM_FIELDS, api } from '../services/api';
import { ConfirmModal, ConfirmModalProps } from '../components/ConfirmModal';

interface SettingsViewProps {
  settings: SystemSettings;
  onSaveSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  apiOnline: boolean;
  onCheckApi: () => Promise<void>;
  themeColor?: string;
  onThemeColorChange?: (color: string) => void;
  userRole?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  apiOnline,
  onCheckApi,
  themeColor,
  onThemeColorChange,
  userRole,
}) => {
  const [defaultCurrency, setDefaultCurrency] = useState<'USD' | 'IQD'>(settings.defaultCurrency || 'IQD');
  const [usdToIqdRate, setUsdToIqdRate] = useState<number>(settings.usdToIqdRate || 1310);
  
  // Field expansion & collapse state
  const [collapsedFieldIds, setCollapsedFieldIds] = useState<Record<string, boolean>>({});
  const [isSectionCollapsed, setIsSectionCollapsed] = useState<boolean>(false);

  const toggleFieldCollapse = (fieldId: string) => {
    setCollapsedFieldIds((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId],
    }));
  };

  const handleToggleAllFields = (filteredList: DynamicField[]) => {
    const allCollapsed = filteredList.every((f, idx) => collapsedFieldIds[getFieldId(f, idx)]);
    const nextState: Record<string, boolean> = {};
    filteredList.forEach((f, idx) => {
      nextState[getFieldId(f, idx)] = !allCollapsed;
    });
    setCollapsedFieldIds(nextState);
  };

  const [fields, setFields] = useState<DynamicField[]>(() => {
    const raw = settings.dynamicFields && settings.dynamicFields.length > 0
      ? settings.dynamicFields
      : DEFAULT_SYSTEM_FIELDS;
    return raw.map((f, idx) => ({
      ...f,
      id: f.id || f.key || `f-${idx}-${Date.now()}`,
      name: f.name || `Field ${idx + 1}`,
      key: f.key || `field_${idx}`,
      type: f.type || 'Alphanumeric',
      required: Boolean(f.required),
      system: Boolean(f.system),
      excelHeader: f.excelHeader || '',
    }));
  });
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(settings.adminUsers || []);

  // Fetch users from API on mount
  useEffect(() => {
    api.getUsers().then((list) => {
      if (list && list.length > 0) {
        setAdminUsers(list);
      }
    }).catch(() => {});
  }, []);

  // Unified User Management Modal State (Item 18 - fixes update and duplicate modal bug)
  const [userModal, setUserModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    user?: AdminUser | null;
  }>({ isOpen: false, mode: 'add', user: null });

  const [modalUserName, setModalUserName] = useState('');
  const [modalUserEmail, setModalUserEmail] = useState('');
  const [modalUserPassword, setModalUserPassword] = useState('');
  const [modalUserRole, setModalUserRole] = useState<'Super Admin' | 'Fiscal Auditor'>('Super Admin');
  const [modalUserStatus, setModalUserStatus] = useState<'Active' | 'Suspended'>('Active');
  const [userError, setUserError] = useState('');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Toast Notification State (Item 17)
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Enhanced Warning & Confirmation Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState<ConfirmModalProps | null>(null);

  // Synchronize when settings are updated from external props
  const lastSettingsRef = React.useRef(settings);
  useEffect(() => {
    if (settings.defaultCurrency) setDefaultCurrency(settings.defaultCurrency);
    if (settings.usdToIqdRate) setUsdToIqdRate(settings.usdToIqdRate);
    if (settings.dynamicFields && settings.dynamicFields !== lastSettingsRef.current.dynamicFields && settings.dynamicFields.length > 0) {
      lastSettingsRef.current = settings;
      setFields(
        settings.dynamicFields.map((f, idx) => ({
          ...f,
          id: f.id || f.key || `f-${idx}-${Date.now()}`,
          name: f.name || `Field ${idx + 1}`,
          key: f.key || `field_${idx}`,
          type: f.type || 'Alphanumeric',
          required: Boolean(f.required),
          system: Boolean(f.system),
          excelHeader: f.excelHeader || '',
        }))
      );
    }
  }, [settings]);

  const [apiUrlInput, setApiUrlInput] = useState(getApiUrl());
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE');
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Field filter state
  const [fieldSearch, setFieldSearch] = useState<string>('');

  // Add field modal state
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldHeader, setNewFieldHeader] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldDataType>('Alphanumeric');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Conversion test calculator state
  const [calcUsdAmount, setCalcUsdAmount] = useState<number>(1000);

  // Connection testing inside settings
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'IDLE' | 'OK' | 'FAIL'; msg: string; latency?: number }>({
    status: 'IDLE',
    msg: '',
  });

  const handleSave = async () => {
    setSaveStatus('SAVING');
    setSaveMessage('Saving configuration to database and local vault...');

    try {
      setApiUrl(apiUrlInput);
      await onSaveSettings({
        defaultCurrency,
        usdToIqdRate: Number(usdToIqdRate) || 1310,
        dynamicFields: fields,
        adminUsers,
      });

      setSaveStatus('SAVED');
      setSaveMessage('All configuration changes have been permanently saved & activated!');
      setTimeout(() => {
        setSaveStatus('IDLE');
        setSaveMessage('');
      }, 3500);
    } catch (err: any) {
      setSaveStatus('ERROR');
      setSaveMessage(err.message || 'Failed to save settings to server.');
      setTimeout(() => setSaveStatus('IDLE'), 4500);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setTestResult({ status: 'IDLE', msg: 'Testing endpoint...' });
    const start = performance.now();
    try {
      setApiUrl(apiUrlInput);
      await onCheckApi();
      const elapsed = Math.round(performance.now() - start);
      setTestResult({
        status: 'OK',
        msg: `Connection successful (${elapsed}ms). Server responded properly.`,
        latency: elapsed,
      });
    } catch (err: any) {
      setTestResult({
        status: 'FAIL',
        msg: err.message || 'Cannot establish connection to server.',
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  // Helper to reliably identify a field even if id or key is missing
  const getFieldId = (f: DynamicField, idx?: number) => f.id || f.key || `f-${idx}`;

  const handleRemoveField = (fieldId: string) => {
    setFields((prev) => prev.filter((f, idx) => getFieldId(f, idx) !== fieldId));
  };

  const handleUpdateFieldType = (fieldId: string, newType: FieldDataType) => {
    setFields((prev) =>
      prev.map((f, idx) => (getFieldId(f, idx) === fieldId ? { ...f, type: newType } : f))
    );
  };

  const handleUpdateFieldLabel = (fieldId: string, newName: string) => {
    setFields((prev) =>
      prev.map((f, idx) => (getFieldId(f, idx) === fieldId ? { ...f, name: newName } : f))
    );
  };

  const handleUpdateFieldExcel = (fieldId: string, newExcel: string) => {
    setFields((prev) =>
      prev.map((f, idx) => (getFieldId(f, idx) === fieldId ? { ...f, excelHeader: newExcel } : f))
    );
  };

  const handleToggleRequired = (fieldId: string) => {
    setFields((prev) =>
      prev.map((f, idx) => (getFieldId(f, idx) === fieldId ? { ...f, required: !f.required } : f))
    );
  };

  const handleRestoreDefaults = () => {
    setFields(DEFAULT_SYSTEM_FIELDS.map((f, idx) => ({ ...f, id: f.id || `f-${idx}` })));
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    const generatedKey = newFieldKey.trim() || newFieldName.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const newField: DynamicField = {
      id: `df-${Date.now()}`,
      name: newFieldName.trim(),
      key: generatedKey,
      excelHeader: newFieldHeader.trim() || newFieldName.trim(),
      type: newFieldType,
      required: newFieldRequired,
      system: false,
    };
    setFields((prev) => [...prev, newField]);
    setNewFieldName('');
    setNewFieldKey('');
    setNewFieldHeader('');
    setNewFieldType('Alphanumeric');
    setNewFieldRequired(false);
    setShowAddFieldModal(false);
  };

  const handleOpenAddUser = () => {
    setModalUserName('');
    setModalUserEmail('');
    setModalUserPassword('');
    setModalUserRole('Super Admin');
    setModalUserStatus('Active');
    setUserError('');
    setUserModal({ isOpen: true, mode: 'add', user: null });
  };

  const handleOpenEditUser = (u: AdminUser) => {
    setModalUserName(u.name);
    setModalUserEmail(u.email);
    setModalUserPassword('');
    setModalUserRole(u.role === 'Fiscal Auditor' ? 'Fiscal Auditor' : 'Super Admin');
    setModalUserStatus(u.status === 'Suspended' ? 'Suspended' : 'Active');
    setUserError('');
    setUserModal({ isOpen: true, mode: 'edit', user: u });
  };

  const handleSaveUserModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalUserName.trim() || !modalUserEmail.trim()) {
      setUserError('Name and Email are required.');
      return;
    }
    if (userModal.mode === 'add' && !modalUserPassword.trim()) {
      setUserError('Password is required when creating a new account.');
      return;
    }

    setIsSubmittingUser(true);
    setUserError('');
    try {
      if (userModal.mode === 'add') {
        const created = await api.createUser({
          name: modalUserName.trim(),
          email: modalUserEmail.trim(),
          password: modalUserPassword.trim(),
          role: modalUserRole,
          status: modalUserStatus,
        });
        setAdminUsers((prev) => [...prev, created]);
        setUserModal({ isOpen: false, mode: 'add', user: null });

        // Item 4: Show success confirmation popup
        setConfirmModalConfig({
          isOpen: true,
          variant: 'info',
          badgeLabel: 'User Account Created',
          title: 'Officer Created Successfully',
          message: `Privileged officer account "${created.name}" (${created.email}) has been enrolled into the directory with role clearance [${created.role}] and status [${created.status}].`,
          confirmText: 'Done',
          bulletPoints: [
            `Officer Name: ${created.name}`,
            `Assigned Role: ${created.role}`,
            `Status: ${created.status}`,
            'Credentials are active and ready for immediate login',
          ],
          contextDetails: [
            { label: 'Officer Name', value: created.name },
            { label: 'Institutional Email', value: created.email },
            { label: 'Role Clearance', value: created.role, highlight: true },
            { label: 'Account Status', value: created.status, badge: true },
          ],
          onConfirm: () => setConfirmModalConfig(null),
          onCancel: () => setConfirmModalConfig(null),
        });
      } else if (userModal.user) {
        const updated = await api.updateUser(userModal.user.id, {
          name: modalUserName.trim(),
          email: modalUserEmail.trim(),
          password: modalUserPassword.trim() || undefined,
          role: modalUserRole,
          status: modalUserStatus,
        });
        setAdminUsers((prev) => prev.map((u) => (u.id === userModal.user!.id ? updated : u)));
        setUserModal({ isOpen: false, mode: 'add', user: null });
      }
    } catch (err: any) {
      setUserError(err.message || 'Failed to save operator account.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    setConfirmModalConfig({
      isOpen: true,
      variant: 'danger',
      badgeLabel: 'Revoke Officer Access',
      title: `Revoke Clearance: ${name}`,
      message: `Are you certain you want to permanently delete officer "${name}"? This will immediately revoke their sign-in credentials and access permissions to the institutional payroll suite.`,
      confirmText: 'Revoke & Delete Officer',
      bulletPoints: [
        'Officer will be immediately revoked from active access and signed out',
        'Audit records previously logged by this officer remain preserved for forensic review'
      ],
      contextDetails: [
        { label: 'Officer Name', value: name },
        { label: 'Clearance Record ID', value: id },
      ],
      onConfirm: async () => {
        setConfirmModalConfig(null);
        try {
          await api.deleteUser(id);
          setAdminUsers((prev) => prev.filter((u) => u.id !== id));
        } catch (err: any) {
          alert(err.message || 'Failed to delete operator account.');
        }
      },
      onCancel: () => setConfirmModalConfig(null),
    });
  };

  const handleToggleUserStatus = async (u: AdminUser) => {
    const nextStatus = u.status === 'Active' ? 'Suspended' : 'Active';
    try {
      const updated = await api.updateUser(u.id, { status: nextStatus });
      setAdminUsers((prev) => prev.map((item) => (item.id === u.id ? updated : item)));
    } catch {
      setAdminUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, status: nextStatus } : item)));
    }
  };

  const getTypeBadge = (type: FieldDataType) => {
    switch (type) {
      case 'Currency':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Percentage':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Numeric':
      case 'Number':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Date':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Boolean':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Calculated':
        return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
      case 'Alphanumeric':
      case 'Text':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredFields = fields.filter((f) => {
    if (!fieldSearch) return true;
    const q = fieldSearch.toLowerCase();
    return (
      (f.name || '').toLowerCase().includes(q) ||
      (f.key || '').toLowerCase().includes(q) ||
      (f.excelHeader || '').toLowerCase().includes(q) ||
      (f.type || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#f8fafc] text-slate-800 animate-fade-in">
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
        {/* Top Header Card (Without duplicate h1 title - Item 16) */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/90 p-5 md:p-6 shadow-xs">
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-2xs">
                  <span className="material-symbols-outlined text-[24px]">tune</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Institutional Payroll Parameters & Workspace Preferences
                  </p>
                  <p className="text-xs text-slate-500">
                    Dual-currency conversion engine, interface theme branding, and administrative officer credentials.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <button
                id="save-settings-btn"
                type="button"
                onClick={async () => {
                  setSaveStatus('SAVING');
                  try {
                    await onSaveSettings({
                      defaultCurrency,
                      usdToIqdRate,
                      dynamicFields: fields,
                    });
                    setSaveStatus('SAVED');
                    setShowSavedToast(true);
                    setTimeout(() => {
                      setShowSavedToast(false);
                      setSaveStatus('IDLE');
                    }, 3500);
                  } catch (err: any) {
                    setSaveStatus('ERROR');
                  }
                }}
                disabled={saveStatus === 'SAVING'}
                className="px-6 py-2.5 bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-900/20 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {saveStatus === 'SAVED' ? 'check_circle' : saveStatus === 'SAVING' ? 'hourglass_top' : 'save'}
                </span>
                <span>
                  {saveStatus === 'SAVING' ? 'Saving...' : saveStatus === 'SAVED' ? 'Saved!' : 'Save System Settings'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 1: CURRENCY & CONVERSION ENGINE (Light Theme) */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shadow-2xs">
                <span className="material-symbols-outlined text-[22px]">currency_exchange</span>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Institutional Currency & Exchange Rate Engine</h2>
                <p className="text-xs text-slate-500">
                  Controls institutional payroll denomination and dual-currency conversion across all views.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-mono font-bold text-emerald-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              1 USD = {usdToIqdRate.toLocaleString()} IQD
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Denomination Picker */}
            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Primary Payroll Currency (System Default)
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDefaultCurrency('IQD')}
                  className={`py-3.5 px-4 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between shadow-2xs ${
                    defaultCurrency === 'IQD'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <span className="text-base font-black block">🇮🇶 IQD</span>
                    <span className="text-[11px] opacity-75">Iraqi Dinar (Standard)</span>
                  </div>
                  {defaultCurrency === 'IQD' && (
                    <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setDefaultCurrency('USD')}
                  className={`py-3.5 px-4 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between shadow-2xs ${
                    defaultCurrency === 'USD'
                      ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <span className="text-base font-black block">🇺🇸 USD</span>
                    <span className="text-[11px] opacity-75">US Dollar Pegged</span>
                  </div>
                  {defaultCurrency === 'USD' && (
                    <span className="material-symbols-outlined text-amber-600 text-[20px]">check_circle</span>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                All ledger amounts, salaries, and reports will calculate & display in <strong className="text-slate-800">{defaultCurrency}</strong> upon saving.
              </p>
            </div>

            {/* Exchange Rate Input & Live Preview Calculator */}
            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Fixed Exchange Rate (IQD per 1 USD)
                </label>
                <span className="text-[11px] text-amber-700 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Central Bank Rate</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    1 USD =
                  </span>
                  <input
                    type="number"
                    value={usdToIqdRate}
                    onChange={(e) => setUsdToIqdRate(Math.max(1, Number(e.target.value)))}
                    className="w-full pl-20 pr-16 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-mono font-bold text-emerald-700 focus:border-emerald-600 focus:outline-none shadow-2xs"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    IQD
                  </span>
                </div>
              </div>

              {/* Interactive Live Converter Shape */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
                <div className="space-y-0.5">
                  <span className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider block">Live Conversion Test</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700 font-mono font-semibold">$ {calcUsdAmount.toLocaleString()} USD</span>
                    <span className="text-slate-400">⇄</span>
                    <span className="text-emerald-700 font-bold font-mono">
                      {(calcUsdAmount * usdToIqdRate).toLocaleString()} IQD
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {[500, 1000, 2500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCalcUsdAmount(amt)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
                        calcUsdAmount === amt
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: DYNAMIC FIELDS MAPPING (Light Theme with Expand & Collapse) */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs">
                <span className="material-symbols-outlined text-[24px]">grid_view</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Dynamic Fields Mapping</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-mono font-bold">
                    {fields.length} Active Columns
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Configure custom data columns available during spreadsheet imports. Expand or collapse fields for easy management.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Toggle All Fields (Expand / Collapse All) */}
              <button
                type="button"
                onClick={() => handleToggleAllFields(filteredFields)}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                title="Toggle all fields between compact and expanded view"
              >
                <span className="material-symbols-outlined text-[17px] text-slate-600">
                  {filteredFields.every((f, idx) => collapsedFieldIds[getFieldId(f, idx)]) ? 'unfold_more' : 'unfold_less'}
                </span>
                <span>
                  {filteredFields.every((f, idx) => collapsedFieldIds[getFieldId(f, idx)]) ? 'Expand All' : 'Collapse All'}
                </span>
              </button>

              {/* Toggle Whole Section */}
              <button
                type="button"
                onClick={() => setIsSectionCollapsed(!isSectionCollapsed)}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                title="Collapse or expand the entire dynamic fields section"
              >
                <span className="material-symbols-outlined text-[17px] text-slate-600">
                  {isSectionCollapsed ? 'expand_more' : 'expand_less'}
                </span>
                <span>{isSectionCollapsed ? 'Show Section' : 'Hide Section'}</span>
              </button>

              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                title="Restore standard institutional columns"
              >
                <span className="material-symbols-outlined text-[17px] text-amber-500">auto_fix_high</span>
                <span>Load Standards</span>
              </button>

              <button
                id="add-custom-field-btn"
                type="button"
                onClick={() => setShowAddFieldModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Add Field</span>
              </button>
            </div>
          </div>

          {!isSectionCollapsed && (
            <>
              {/* Search Toolbar for fields */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    placeholder="Filter fields by name, key, or type..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 select-text cursor-text transition-all shadow-2xs"
                  />
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Showing {filteredFields.length} of {fields.length}
                </span>
              </div>

              {/* Fields Grid: 3 columns with Extend / Collapse support */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredFields.map((field, idx) => {
                  const fieldIdentifier = getFieldId(field, idx);
                  const isCollapsed = Boolean(collapsedFieldIds[fieldIdentifier]);

                  if (isCollapsed) {
                    {/* Collapsed Compact 1-Line Card */}
                    return (
                      <div
                        key={fieldIdentifier}
                        onClick={() => toggleFieldCollapse(fieldIdentifier)}
                        className="rounded-2xl bg-slate-50/80 border border-slate-200 hover:bg-white hover:border-slate-300 transition-all p-3 flex items-center justify-between gap-3 shadow-2xs group cursor-pointer"
                        title="Click to extend this field"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="material-symbols-outlined text-slate-400 text-[18px]">
                            drag_indicator
                          </span>
                          <span className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                            {field.name}
                          </span>
                          {field.excelHeader && (
                            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-amber-800 text-[10.5px] font-mono truncate max-w-[130px]">
                              {field.excelHeader}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${getTypeBadge(field.type)}`}>
                            {field.type}
                          </span>
                          {field.required && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                              ★ Req
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleFieldCollapse(fieldIdentifier)}
                            className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Extend field details"
                          >
                            <span className="material-symbols-outlined text-[18px]">expand_more</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveField(fieldIdentifier)}
                            className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete field"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  {/* Expanded Full Card */}
                  return (
                    <div
                      key={fieldIdentifier}
                      className="rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all p-4 flex flex-col justify-between space-y-3.5 shadow-sm group"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="material-symbols-outlined text-slate-400 text-[18px] cursor-grab select-none">
                            drag_indicator
                          </span>
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => handleUpdateFieldLabel(fieldIdentifier, e.target.value)}
                            className="select-text cursor-text text-xs sm:text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-indigo-500 rounded-xl px-3 py-1.5 outline-none w-full truncate transition-all shadow-2xs"
                            title="Click to edit field display name"
                          />
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleFieldCollapse(fieldIdentifier)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="Collapse field card"
                          >
                            <span className="material-symbols-outlined text-[18px]">expand_less</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveField(fieldIdentifier)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Delete field"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Card Sub-row: Excel Alias */}
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                        <span className="font-semibold text-slate-600">Excel Alias:</span>
                        <input
                          type="text"
                          value={field.excelHeader || ''}
                          onChange={(e) => handleUpdateFieldExcel(fieldIdentifier, e.target.value)}
                          placeholder="Header in Excel"
                          className="select-text cursor-text text-amber-900 bg-amber-50/50 px-2.5 py-1 rounded-lg border border-amber-200 text-[11px] outline-none focus:border-amber-500 focus:bg-white text-right w-full max-w-[160px] font-mono shadow-2xs"
                          title="Header name in imported Excel file"
                        />
                      </div>

                      {/* Card Footer: Type selector & Required toggle */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-semibold">Type:</span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleRequired(fieldIdentifier)}
                            className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold border cursor-pointer transition-all shadow-2xs ${
                              field.required
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800'
                            }`}
                            title={field.required ? 'Field is Required' : 'Field is Optional'}
                          >
                            {field.required ? '★ Req' : 'Opt'}
                          </button>

                          <select
                            value={field.type}
                            onChange={(e) => handleUpdateFieldType(fieldIdentifier, e.target.value as FieldDataType)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border outline-none cursor-pointer ${getTypeBadge(
                              field.type
                            )} bg-white shadow-2xs`}
                            title="Change data type for this column"
                          >
                            <option value="Alphanumeric">Alphanumeric</option>
                            <option value="Currency">Currency</option>
                            <option value="Numeric">Numeric</option>
                            <option value="Date">Date</option>
                            <option value="Percentage">Percentage</option>
                            <option value="Boolean">Boolean</option>
                            <option value="Calculated">Calculated</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* SECTION 3: PRIVILEGED ACCESS USERS (Light Theme) */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 shadow-2xs">
                <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">Privileged Operators & Clearance</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-[11px] font-bold border border-cyan-200">
                    {adminUsers.length} Accounts
                  </span>
                </div>
                <p className="text-xs text-slate-500">Institutional accounts with payroll signing authority and system access.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddUser}
              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98] self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Add Privileged Officer</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Officer</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                        {u.name.charAt(0)}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          u.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(u)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
                          title="Edit officer profile, role, or suspend/activate status"
                        >
                          <span className="material-symbols-outlined text-[15px] text-teal-600">edit</span>
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 cursor-pointer transition-colors shadow-2xs"
                          title="Delete officer account"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {adminUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No privileged officers registered. Click "+ Add Privileged Officer" above to create an authorized account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 4: SERVER API CONNECTIVITY (Light Theme) */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
                <span className="material-symbols-outlined text-[22px]">dns</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Backend API Server Endpoint</h3>
                <p className="text-xs text-slate-500">
                  Configure the Ktor REST engine connection URL and perform latency diagnostics.
                </p>
              </div>
            </div>

            <span
              className={`text-[11px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                apiOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {apiOnline ? 'Server Online' : 'Server Offline'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={apiUrlInput}
                onChange={(e) => setApiUrlInput(e.target.value)}
                placeholder="http://127.0.0.1:8080"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:bg-white focus:border-blue-500 shadow-2xs"
              />
            </div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConn}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <span className={`material-symbols-outlined text-[16px] ${isTestingConn ? 'animate-spin' : ''}`}>
                {isTestingConn ? 'sync' : 'network_ping'}
              </span>
              <span>{isTestingConn ? 'Pinging...' : 'Test Connection'}</span>
            </button>
          </div>

          {testResult.status !== 'IDLE' && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                testResult.status === 'OK'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {testResult.status === 'OK' ? 'check_circle' : 'error'}
              </span>
              <span>{testResult.msg}</span>
            </div>
          )}
        </div>
      </div>

      {/* ADD CUSTOM FIELD MODAL (Light Theme) */}
      {showAddFieldModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl space-y-5 animate-scale-in select-text">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-[22px]">add_circle</span>
                Add Dynamic Field
              </h3>
              <button
                type="button"
                onClick={() => setShowAddFieldModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-600 font-bold block">Field Display Name</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Housing Allowance"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:bg-white focus:border-indigo-500 select-text cursor-text"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-bold block">Field Key (System ID)</label>
                <input
                  type="text"
                  placeholder="e.g. housing_allowance"
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono outline-none focus:bg-white focus:border-indigo-500 select-text cursor-text"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-bold block">Data Type</label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as FieldDataType)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer font-bold"
                >
                  <option value="Alphanumeric">Alphanumeric (Text)</option>
                  <option value="Currency">Currency (Monetary Payout)</option>
                  <option value="Numeric">Numeric (Count / Integer)</option>
                  <option value="Date">Date (Calendar Timestamp)</option>
                  <option value="Percentage">Percentage (Rate)</option>
                  <option value="Boolean">Boolean (Yes / No)</option>
                  <option value="Calculated">Calculated (Dynamic Metric)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-bold block">Excel Header Alias (Matching Column)</label>
                <input
                  type="text"
                  placeholder="e.g. مخصصات السكن"
                  value={newFieldHeader}
                  onChange={(e) => setNewFieldHeader(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-amber-900 outline-none focus:bg-white focus:border-indigo-500 select-text cursor-text"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="new-field-req"
                  checked={newFieldRequired}
                  onChange={(e) => setNewFieldRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="new-field-req" className="text-slate-700 font-semibold cursor-pointer">
                  Require this field in Employee records & Excel rosters
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddFieldModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddField}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED PRIVILEGED USER MODAL (Light Theme) */}
      {userModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 text-[22px]">
                  {userModal.mode === 'add' ? 'person_add' : 'manage_accounts'}
                </span>
                <span>{userModal.mode === 'add' ? 'Add Privileged Officer' : 'Edit Officer Clearance'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setUserModal({ isOpen: false, mode: 'add', user: null })}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveUserModal} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-600 font-bold block">Officer Name *</label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Dr. Haidar Al-Saadi"
                  value={modalUserName}
                  onChange={(e) => setModalUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:bg-white focus:border-teal-500 cursor-text select-text"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-bold block">Institutional Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. officer@institution.iq"
                  value={modalUserEmail}
                  onChange={(e) => setModalUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-teal-800 font-mono outline-none focus:bg-white focus:border-teal-500 cursor-text select-text"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-bold block">
                  {userModal.mode === 'add' ? 'Clearance Password *' : 'Reset Password (optional)'}
                </label>
                <input
                  type="password"
                  required={userModal.mode === 'add'}
                  placeholder={userModal.mode === 'add' ? 'Enter clearance password' : 'Leave blank to retain current password'}
                  value={modalUserPassword}
                  onChange={(e) => setModalUserPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:bg-white focus:border-teal-500 font-mono cursor-text select-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600 font-bold block">Assigned Role</label>
                  <select
                    value={modalUserRole}
                    onChange={(e) => setModalUserRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:bg-white focus:border-teal-500 font-bold cursor-pointer"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Fiscal Auditor">Fiscal Auditor</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-bold block">Status</label>
                  <select
                    value={modalUserStatus}
                    onChange={(e) => setModalUserStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:bg-white focus:border-teal-500 font-bold cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {userError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
                  <span>{userError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModal({ isOpen: false, mode: 'add', user: null })}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md shadow-teal-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmittingUser && <span className="animate-spin material-symbols-outlined text-[16px]">sync</span>}
                  <span>
                    {isSubmittingUser
                      ? 'Saving...'
                      : userModal.mode === 'add'
                      ? 'Create Account'
                      : 'Update Clearance'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom-Right Saved Toast (Item 17) */}
      {showSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-[#004d40] text-white rounded-2xl shadow-2xl border border-emerald-400/40 animate-fade-in">
          <span className="material-symbols-outlined text-emerald-300 text-[22px]">verified</span>
          <div>
            <p className="font-bold text-xs text-white">All changes have been saved</p>
            <p className="text-[11px] text-emerald-200">System settings and preferences updated successfully.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSavedToast(false)}
            className="text-emerald-300 hover:text-white ml-2 p-1"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Rich Warning & Confirmation Modal */}
      {confirmModalConfig && <ConfirmModal {...confirmModalConfig} />}
    </div>
  );
};
