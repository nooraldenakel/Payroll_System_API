import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Employee } from '../types';
import { formatMoney } from '../services/api';

interface EditCompensationModalProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSave: (updated: Partial<Employee>) => Promise<void>;
  rate?: number;
}

export const EditCompensationModal: React.FC<EditCompensationModalProps> = ({
  isOpen,
  employee,
  onClose,
  onSave,
  rate = 1310,
}) => {
  const [name, setName] = useState('');
  const [isForeign, setIsForeign] = useState(false);
  const [hasArrivalFee, setHasArrivalFee] = useState(false);
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [bonus, setBonus] = useState<number>(0);
  const [searchFee, setSearchFee] = useState<number>(0);
  const [insurance, setInsurance] = useState<number>(0);
  const [absenceDays, setAbsenceDays] = useState<number>(0);
  const [absenceDeduct, setAbsenceDeduct] = useState<number>(0);
  const [salaryState, setSalaryState] = useState<'UNPAID' | 'PAID' | 'STOPPED'>('UNPAID');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setName(employee.fullName || '');
      const foreign = employee.currency === 'USD' || employee.isForeign || false;
      setIsForeign(foreign);
      setHasArrivalFee((employee.arrivalFee || 0) > 0);
      setBaseSalary(employee.baseSalary || 0);
      setBonus(employee.bonus || 0);
      setSearchFee(employee.searchFee || 0);
      setInsurance(employee.insurance || 0);
      setAbsenceDays(employee.absenceDays || 0);
      setAbsenceDeduct(employee.absence || 0);
      setSalaryState(employee.paymentStatus || 'UNPAID');
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const currentCurrency = isForeign ? 'USD' : 'IQD';

  // Handle Base Salary changes with auto absence deduction recalculation
  const handleBaseSalaryChange = (val: number) => {
    setBaseSalary(val);
    if (absenceDays > 0 && val > 0) {
      setAbsenceDeduct(Math.round((val / 30.0 * absenceDays) * 100.0) / 100.0);
    }
  };

  // Handle Absence Days changes with auto absence deduction recalculation
  const handleAbsenceDaysChange = (days: number) => {
    setAbsenceDays(days);
    if (days > 0 && baseSalary > 0) {
      setAbsenceDeduct(Math.round((baseSalary / 30.0 * days) * 100.0) / 100.0);
    } else if (days === 0) {
      setAbsenceDeduct(0);
    }
  };

  // Real-time calculated arrival fee
  const calculatedArrivalFee = hasArrivalFee ? Math.round(baseSalary * 0.05) : 0;

  // Real-time calculated absence deduction (Base / 30 * days)
  const effectiveAbsenceDeduct = absenceDays > 0 && baseSalary > 0
    ? Math.round((baseSalary / 30.0 * absenceDays) * 100.0) / 100.0
    : absenceDeduct;

  // Effective search fee and insurance for calculations
  const effectiveSearchFee = isForeign && searchFee >= 500
    ? Math.round((searchFee / 1310.0) * 100.0) / 100.0
    : searchFee;

  const effectiveInsurance = isForeign && insurance >= 500
    ? Math.round((insurance / 1310.0) * 100.0) / 100.0
    : insurance;

  // Real-time calculated Net
  const calculatedNet = Math.max(
    0,
    baseSalary + bonus - effectiveSearchFee - effectiveInsurance - effectiveAbsenceDeduct - calculatedArrivalFee
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalBase = (!isForeign && baseSalary > 0 && baseSalary < 100000) ? baseSalary * 1000 : baseSalary;
      await onSave({
        id: employee.id,
        fullName: name.trim() || employee.fullName,
        currency: currentCurrency,
        isForeign,
        baseSalary: finalBase,
        bonus,
        searchFee: effectiveSearchFee,
        searchFeeIqd: isForeign ? (searchFee >= 500 ? searchFee : Math.round(searchFee * 1310)) : undefined,
        insurance: effectiveInsurance,
        insuranceIqd: isForeign ? (insurance >= 500 ? insurance : Math.round(insurance * 1310)) : undefined,
        absence: effectiveAbsenceDeduct,
        absenceDays,
        arrivalFee: calculatedArrivalFee,
        netSalary: calculatedNet,
        paymentStatus: salaryState,
        paidAt:
          salaryState === 'PAID'
            ? employee.paidAt || new Date().toISOString().replace('T', ' ').slice(0, 16)
            : undefined,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-xl bg-white text-slate-800 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              Edit Compensation Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Update salary, currency, foreign status, arrival fee, search fee, and deductions for{' '}
              <strong className="text-slate-700">{employee.fullName}</strong> ({employee.employeeCode || employee.id}).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="Close modal"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Employee Name */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Employee Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-teal-600 outline-none transition-all text-xs font-semibold text-slate-800"
              required
            />
          </div>

          {/* Checkboxes: Foreign & Arrival Fee */}
          <div className="flex items-center gap-6 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={isForeign}
                onChange={(e) => setIsForeign(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <span>Foreign (USD $)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={hasArrivalFee}
                onChange={(e) => setHasArrivalFee(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <span>Arrival Fee (0.05)</span>
            </label>
          </div>

          {/* 2-column Inputs matching Pic 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Base Salary */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Base Salary ({currentCurrency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={baseSalary || ''}
                onChange={(e) => handleBaseSalaryChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-teal-600 outline-none font-mono text-xs font-bold text-slate-800"
              />
            </div>

            {/* Bonus */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Bonus ({currentCurrency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={bonus || ''}
                onChange={(e) => setBonus(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-teal-600 outline-none font-mono text-xs font-bold text-slate-800"
              />
            </div>

            {/* Search Fee */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Search Fee ({currentCurrency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={searchFee || ''}
                onChange={(e) => setSearchFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-teal-600 outline-none font-mono text-xs font-bold text-slate-800"
              />
            </div>

            {/* Insurance */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Insurance ({currentCurrency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={insurance || ''}
                onChange={(e) => setInsurance(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-teal-600 outline-none font-mono text-xs font-bold text-slate-800"
              />
            </div>

            {/* Absence Days */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 block">Absence (Days)</label>
                {baseSalary > 0 && (
                  <span className="text-[10.5px] text-slate-400 font-mono">
                    {formatMoney(baseSalary / 30, currentCurrency)}/day
                  </span>
                )}
              </div>
              <input
                type="number"
                min="0"
                value={absenceDays || ''}
                onChange={(e) => handleAbsenceDaysChange(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-teal-600 outline-none font-mono text-xs font-bold text-slate-800"
              />
            </div>

            {/* Absence Deduct */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Absence Deduct ({currentCurrency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={effectiveAbsenceDeduct || ''}
                onChange={(e) => setAbsenceDeduct(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-teal-600 outline-none font-mono text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          {/* State of Salary Dropdown */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">State of Salary</label>
            <select
              value={salaryState}
              onChange={(e) => setSalaryState(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-teal-600 outline-none text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <option value="UNPAID">⭕ Unpaid (Not Yet)</option>
              <option value="PAID">🟢 Paid</option>
              <option value="STOPPED">🔴 Stopped / Withheld</option>
            </select>
          </div>

          {/* Calculated Net Display matching Pic 3 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-700 text-xs">Calculated Net:</span>
            <span className="font-black font-mono text-base text-teal-700">
              {formatMoney(calculatedNet, currentCurrency, rate)}
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all cursor-pointer text-center justify-center whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-950/20 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
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
