'use client';

import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { usePayroll } from '../lib/PayrollContext';

export default function SettingsPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { settings, updateSettings, addDynamicField, removeDynamicField, addAdminUser, showToast } = usePayroll();

  // Baseline Financial Currency & Exchange States (Only Dinar & Dollar)
  const [currency, setCurrency] = useState(settings.defaultCurrency || 'Dinar (IQD)');
  const [usdRate, setUsdRate] = useState(settings.usdToDinarRate || 1310);

  // Dynamic Fields & Invite Modal States
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('Alphanumeric');
  const [isAddingField, setIsAddingField] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Editor');

  const handleSaveAll = () => {
    updateSettings({
      defaultCurrency: currency,
      usdToDinarRate: Number(usdRate),
    });
    showToast('Configuration Saved', 'Currency baseline and exchange rate configurations have been saved.');
  };

  const handleAddFieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;
    addDynamicField({
      name: newFieldName.trim(),
      type: newFieldType,
    });
    setNewFieldName('');
    setIsAddingField(false);
  };

  const handleLoadStandardFields = () => {
    const standardPresets = [
      { id: 'df-id', name: 'Employee ID', type: 'Alphanumeric' },
      { id: 'df-name', name: 'Employee Name', type: 'Alphanumeric' },
      { id: 'df-dept', name: 'Department', type: 'Alphanumeric' },
      { id: 'df-for', name: 'Foreign Staff (USD/IQD)', type: 'Alphanumeric' },
      { id: 'df-base', name: 'Base Salary', type: 'Currency' },
      { id: 'df-arr', name: 'Arrival Agency Fee (0.05)', type: 'Alphanumeric' },
      { id: 'df-bon', name: 'Bonus', type: 'Currency' },
      { id: 'df-doc', name: 'Search Fee', type: 'Currency' },
      { id: 'df-ins', name: 'Insurance', type: 'Currency' },
      { id: 'df-abs', name: 'Absence Days', type: 'Numeric' },
      { id: 'df-net', name: 'Net Salary', type: 'Currency' },
      { id: 'df-sta', name: 'Salary State', type: 'Alphanumeric' },
      { id: 'df-dat', name: 'Paid Date & Time', type: 'Date' },
    ];
    updateSettings({ dynamicFields: standardPresets });
    showToast('Standard Schema Loaded', '13 standard payroll schema fields added to Settings.');
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    addAdminUser({
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
    });
    setInviteName('');
    setInviteEmail('');
    setIsInviteModalOpen(false);
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto bg-surface">
        <TopNav title="System Configuration" onMenuClick={() => setMobileOpen(true)} />

        <div className="p-4 md:p-8 flex-1 max-w-7xl mx-auto w-full space-y-8 pb-28">

          {/* Page Header & Save Action */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  Institutional Financial Engine
                </span>
                <span className="text-xs text-outline font-mono">v4.8-PROD</span>
              </div>
              <h1 className="text-headline-lg font-headline-lg text-on-surface">System Configuration</h1>
              <p className="text-body-md text-on-surface-variant">
                Manage currency conversion baselines, exchange rates, and dynamic schema mappings.
              </p>
            </div>
            <button
              onClick={handleSaveAll}
              className="px-6 py-2.5 bg-gradient-to-r from-mint-gradient-start to-mint-gradient-end text-white rounded-xl font-semibold text-body-sm flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">save</span>
              Save Changes
            </button>
          </div>

          {/* Main Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* 1. CURRENCY & EXCHANGE RATE ENGINE (ONLY DINAR & DOLLAR) */}
            <section className="lg:col-span-12 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-surface-container hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6 border-b border-surface-container pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <div>
                    <h2 className="text-title-md font-bold text-on-surface">Currency &amp; Exchange Rate Engine</h2>
                    <p className="text-label-sm text-outline">Baseline disbursement currency and official USD to Dinar conversion</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Engine
                </span>
              </div>

              <div className="space-y-6">
                {/* Currency & USD to Dinar Rate Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant block mb-1.5 uppercase tracking-wider">
                      Default Currency
                    </label>
                    <div className="relative">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-surface-container-low border border-surface-container-high rounded-xl pl-10 pr-4 py-2.5 text-body-sm font-semibold focus:ring-2 focus:ring-primary/30 outline-none cursor-pointer"
                      >
                        <option value="Dinar (IQD)">Dinar (IQD) — Iraqi Dinar</option>
                        <option value="USD ($)">USD ($) — US Dollar</option>
                      </select>
                      <span className="material-symbols-outlined text-outline absolute left-3 top-1/2 -translate-y-1/2 text-[18px]">
                        monetization_on
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        USD to Dinar Rate (1 USD =)
                      </label>
                      <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        Official Rate: {Number(usdRate).toLocaleString()} IQD
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={usdRate}
                        onChange={(e) => setUsdRate(Number(e.target.value))}
                        className="w-full bg-surface-container-low border border-surface-container-high rounded-xl pl-10 pr-16 py-2.5 text-body-sm font-mono font-bold focus:ring-2 focus:ring-primary/30 outline-none"
                        placeholder="1310"
                      />
                      <span className="material-symbols-outlined text-outline absolute left-3 top-1/2 -translate-y-1/2 text-[18px]">
                        currency_exchange
                      </span>
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">
                        Dinar
                      </span>
                    </div>
                  </div>
                </div>

                {/* Foreign Employee Currency Engine Banner */}
                <div className="bg-gradient-to-r from-primary-container/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[22px]">swap_horiz</span>
                    </div>
                    <div>
                      <p className="text-body-sm font-bold text-primary">Foreign Employee Currency Engine</p>
                      <p className="text-xs text-on-surface-variant">
                        Foreign employees are paid in <strong>USD ($)</strong> while local staff receive <strong>Dinar</strong>. The system uses <strong>1 USD = {Number(usdRate).toLocaleString()} Dinar</strong> to automatically convert foreign salaries for reports and ledger balancing.
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs font-bold text-outline shrink-0 bg-white/80 px-3 py-1.5 rounded-xl border border-primary/20">
                    $1,000 USD = {(1000 * Number(usdRate)).toLocaleString()} IQD
                  </div>
                </div>
              </div>
            </section>

            {/* 2. DYNAMIC FIELDS MAPPING */}
            <section className="lg:col-span-12 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-surface-container hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-surface-container pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-vibrant-indigo/10 flex items-center justify-center text-vibrant-indigo">
                    <span className="material-symbols-outlined">dataset</span>
                  </div>
                  <div>
                    <h2 className="text-title-md font-bold text-on-surface">Dynamic Fields Mapping</h2>
                    <p className="text-label-sm text-outline">Configure custom data columns available during spreadsheet imports.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleLoadStandardFields}
                    className="px-3.5 py-2 bg-vibrant-indigo/10 border border-vibrant-indigo/30 text-vibrant-indigo rounded-xl text-body-sm font-semibold flex items-center gap-1.5 hover:bg-vibrant-indigo/15 transition-all cursor-pointer shadow-2xs"
                    title="Load all standard payroll institutional schema fields"
                  >
                    <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                    Load All Standard Fields
                  </button>

                  <button
                    onClick={() => setIsAddingField(true)}
                    className="px-4 py-2 border border-vibrant-indigo text-vibrant-indigo rounded-xl text-body-sm font-semibold flex items-center gap-2 hover:bg-vibrant-indigo/5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Add Field
                  </button>
                </div>
              </div>

              {/* Add field inline form */}
              {isAddingField && (
                <form onSubmit={handleAddFieldSubmit} className="mb-6 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 flex flex-wrap gap-4 items-end animate-fade-in">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-outline uppercase mb-1">Field Label</label>
                    <input
                      type="text"
                      required
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="e.g. Provident Fund No"
                      className="w-full bg-white border border-outline-variant/40 rounded-xl px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-vibrant-indigo"
                    />
                  </div>
                  <div className="w-44">
                    <label className="block text-xs font-semibold text-outline uppercase mb-1">Data Type</label>
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value)}
                      className="w-full bg-white border border-outline-variant/40 rounded-xl px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-vibrant-indigo cursor-pointer"
                    >
                      <option>Alphanumeric</option>
                      <option>Numeric</option>
                      <option>Currency</option>
                      <option>Date</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-vibrant-indigo text-white rounded-xl text-body-sm font-semibold shadow-xs cursor-pointer"
                    >
                      Save Field
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingField(false)}
                      className="px-4 py-2 border border-outline-variant text-on-surface rounded-xl text-body-sm hover:bg-surface-container cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {settings.dynamicFields.map((field) => (
                  <div
                    key={field.id}
                    className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[18px] cursor-grab">
                          drag_indicator
                        </span>
                        <span className="font-semibold text-body-sm text-on-surface">{field.name}</span>
                      </div>
                      <button
                        onClick={() => removeDynamicField(field.id)}
                        className="text-outline hover:text-error transition-colors p-1 cursor-pointer"
                        title="Delete Field"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-on-surface-variant">
                      <span className="text-outline">Type:</span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-outline-variant/30 font-semibold">
                        {field.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. ADMIN ACCESS & PRIVILEGES */}
            <section className="lg:col-span-12 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-surface-container hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-surface-container pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined">manage_accounts</span>
                  </div>
                  <div>
                    <h2 className="text-title-md font-bold text-on-surface">Admin Access &amp; Privileges</h2>
                    <p className="text-label-sm text-outline">Manage assigned roles, permissions, and security status.</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="px-4 py-2 border border-secondary text-secondary rounded-xl text-body-sm font-semibold flex items-center gap-2 hover:bg-secondary/5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Invite User
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-sm text-on-surface divide-y divide-surface-container-low">
                    {settings.adminUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-mint-gradient-start to-mint-gradient-end text-white flex items-center justify-center font-bold text-xs shadow-xs">
                              {user.initials}
                            </div>
                            <div>
                              <p className="font-semibold text-on-surface">{user.name}</p>
                              <p className="text-xs text-outline">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium">{user.role}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-bold ${
                              user.status === 'Active'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-surface-container text-outline'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.status === 'Active' ? 'bg-primary' : 'bg-outline'
                              }`}
                            />
                            {user.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => showToast('Permissions', `Editing permissions for ${user.name}.`, 'info')}
                            className="text-outline hover:text-primary p-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[20px]">tune</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        </div>

        {/* MODAL: INVITE USER */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-outline-variant/30 relative">
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">person_add</span>
                </div>
                <div>
                  <h3 className="text-title-md font-bold text-on-surface">Invite Administrator</h3>
                  <p className="text-body-sm text-outline">Dispatch invitation link and grant role access.</p>
                </div>
              </div>

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Leila Armstrong"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-2.5 text-body-sm outline-none focus:ring-2 focus:ring-secondary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-outline uppercase mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="l.armstrong@institution.gov"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-2.5 text-body-sm outline-none focus:ring-2 focus:ring-secondary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-outline uppercase mb-1.5">Permission Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-2.5 text-body-sm outline-none focus:ring-2 focus:ring-secondary/40 cursor-pointer"
                  >
                    <option>Super Admin</option>
                    <option>Editor</option>
                    <option>Payroll Auditor</option>
                    <option>Read Only Reviewer</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-surface-container">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 border border-outline-variant rounded-xl text-body-sm text-on-surface hover:bg-surface-container cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-secondary text-white rounded-xl text-body-sm font-semibold shadow-xs hover:bg-secondary/90 cursor-pointer"
                  >
                    Dispatch Invite
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
