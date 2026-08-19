'use client';

import React, { useState } from 'react';
import { usePayroll } from '../lib/PayrollContext';

export default function NewRunModal() {
  const { isNewRunModalOpen, setIsNewRunModalOpen, addPeriod, employees } = usePayroll();
  const [monthName, setMonthName] = useState('October 2026');
  const [abbrMonth, setAbbrMonth] = useState('OCT');
  const [year, setYear] = useState(2026);
  const [departmentScope, setDepartmentScope] = useState('All Departments');

  if (!isNewRunModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeStaffCount = employees.filter((e) => e.status === 'Active').length;
    const estTotal = employees
      .filter((e) => e.status === 'Active')
      .reduce((sum, e) => sum + (e.baseSalary / 12), 0);

    addPeriod({
      name: monthName,
      status: 'Active',
      employeesCount: activeStaffCount || 1240,
      totalPayroll: Math.round(estTotal * 12) || 1250000,
      paidAmount: 0,
      remainingAmount: Math.round(estTotal * 12) || 1250000,
      processedCount: 0,
      creator: 'Aziz Sulaiman',
      createdOn: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      month: abbrMonth,
      year: Number(year),
    });
    setIsNewRunModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-outline-variant/30 relative">
        <button
          onClick={() => setIsNewRunModalOpen(false)}
          className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-mint-gradient-start to-mint-gradient-end flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-[24px]">add_task</span>
          </div>
          <div>
            <h3 className="text-title-md font-bold text-on-surface">Initiate New Payroll Run</h3>
            <p className="text-body-sm text-on-surface-variant">Setup cycle parameters and initiate batch processing.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
              Period Name
            </label>
            <input
              type="text"
              required
              value={monthName}
              onChange={(e) => {
                setMonthName(e.target.value);
                const firstWord = e.target.value.split(' ')[0].toUpperCase().slice(0, 3);
                if (firstWord) setAbbrMonth(firstWord);
              }}
              placeholder="e.g. October 2026"
              className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-body-sm font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-sm font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                Month Code
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={abbrMonth}
                onChange={(e) => setAbbrMonth(e.target.value.toUpperCase())}
                placeholder="OCT"
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-body-sm font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all uppercase"
              />
            </div>
            <div>
              <label className="block text-label-sm font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                Fiscal Year
              </label>
              <input
                type="number"
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-body-sm font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
              Department Scope
            </label>
            <select
              value={departmentScope}
              onChange={(e) => setDepartmentScope(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-body-sm font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
            >
              <option>All Departments</option>
              <option>Engineering</option>
              <option>Operations</option>
              <option>Design</option>
              <option>Human Resources</option>
              <option>Finance</option>
              <option>Marketing</option>
            </select>
          </div>

          <div className="bg-primary-container/10 border border-primary-container/30 rounded-2xl p-4 text-primary text-body-sm flex items-start gap-3">
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">info</span>
            <div>
              <p className="font-semibold">Automated Pre-Validation</p>
              <p className="text-label-sm text-primary/80 mt-0.5">
                This cycle will pull records from active employee rosters ({employees.filter((e) => e.status === 'Active').length} staff).
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsNewRunModalOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>Save &amp; Create Cycle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
