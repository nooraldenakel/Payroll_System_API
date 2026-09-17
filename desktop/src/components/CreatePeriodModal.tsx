import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PayrollPeriod } from '../types';

interface CreatePeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (period: Partial<PayrollPeriod>) => Promise<void>;
  rate?: number;
}

export const CreatePeriodModal: React.FC<CreatePeriodModalProps> = ({
  isOpen,
  onClose,
  onSave,
  rate = 1310,
}) => {
  const [periodName, setPeriodName] = useState('September 2026 Faculty Run');
  const [monthCode, setMonthCode] = useState('2026-09');
  const [fiscalYear, setFiscalYear] = useState('2026');
  const [departmentScope, setDepartmentScope] = useState('All Departments & Faculties');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        code: `PR-${monthCode}`,
        name: periodName,
        startDate: `${fiscalYear}-09-01`,
        endDate: `${fiscalYear}-09-30`,
        payDate: `${fiscalYear}-09-28`,
        currency: 'IQD',
        status: 'OPEN',
        totalGross: 51670000,
        totalNet: 48250000,
        totalDeductions: 3420000,
        employeeCount: 48,
        exchangeRate: rate || 1310,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-7 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header matching Picture 3 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#004d40] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">Initiate New Payroll Run</h3>
              <p className="text-[12px] text-slate-500">
                Create an institutional payroll cycle for the selected month and fiscal department.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Period Name *
            </label>
            <input
              required
              value={periodName}
              onChange={(e) => setPeriodName(e.target.value)}
              placeholder="e.g. September 2026 Faculty Run"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#004d40] focus:bg-white rounded-xl text-[13px] text-slate-900 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
                Month Code *
              </label>
              <input
                required
                value={monthCode}
                onChange={(e) => setMonthCode(e.target.value)}
                placeholder="2026-09"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#004d40] focus:bg-white rounded-xl font-mono text-[13px] text-slate-900 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
                Fiscal Year *
              </label>
              <input
                required
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                placeholder="2026"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#004d40] focus:bg-white rounded-xl font-mono text-[13px] text-slate-900 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Department Scope *
            </label>
            <select
              value={departmentScope}
              onChange={(e) => setDepartmentScope(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#004d40] focus:bg-white rounded-xl text-[13px] text-slate-900 outline-none transition-all cursor-pointer"
            >
              <option value="All Departments & Faculties">All Departments & Faculties (University Wide)</option>
              <option value="College of Medicine">College of Medicine (طب عام)</option>
              <option value="College of Dentistry">College of Dentistry (طب الاسنان)</option>
              <option value="College of Pharmacy">College of Pharmacy (صيدله)</option>
              <option value="College of Engineering">College of Engineering (الهندسه)</option>
              <option value="College of Science">College of Science (علوم)</option>
            </select>
          </div>

          {/* Pre-validation Alert Box matching Picture 3 */}
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">
              info
            </span>
            <div className="text-[12.5px] text-amber-900">
              <strong className="font-bold block text-[13px] mb-0.5 text-amber-950">Automated Pre-Validation</strong>
              All employee active records will automatically clone from the previous closed cycle (August 2026). Custom deductions can be adjusted subsequently.
            </div>
          </div>

          {/* Actions matching Picture 3 */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer text-center justify-center whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-[#004d40] hover:bg-[#00382e] text-white rounded-xl text-[13px] font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              {isSubmitting ? (
                <span className="animate-spin material-symbols-outlined text-[17px]">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[17px]">check</span>
              )}
              Save & Create Cycle
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
