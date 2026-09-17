import React from 'react';
import { createPortal } from 'react-dom';
import { Employee } from '../types';
import { formatMoney } from '../services/api';

interface ViewEmployeeModalProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  rate?: number;
}

export const ViewEmployeeModal: React.FC<ViewEmployeeModalProps> = ({
  isOpen,
  employee,
  onClose,
  rate = 1310,
}) => {
  if (!isOpen || !employee) return null;

  const isForeign = employee.currency === 'USD' || employee.isForeign;
  const curr = isForeign ? 'USD' : 'IQD';

  const getInitials = (name: string) => {
    if (!name) return 'EM';
    const clean = name.replace(/^د\.\s*|^أ\.د\.\s*|^م\.\s*/, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)} ${parts[1].charAt(0)}`;
    }
    return clean.slice(0, 2);
  };

  const isPaid = employee.paymentStatus === 'PAID';
  const isStopped = employee.paymentStatus === 'STOPPED';

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-white text-slate-800 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-bold text-base flex items-center justify-center shadow-md shadow-teal-700/20 shrink-0">
              {getInitials(employee.fullName)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {employee.fullName}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{employee.employeeCode || employee.id}</span>
                <span>•</span>
                <span>{employee.department || 'Academic Staff'}</span>
                <span>•</span>
                <span>
                  {isForeign ? '💵 Foreign (USD)' : '🏛️ Local (Dinar)'}
                </span>
              </p>
            </div>
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

        {/* Content Breakdown List matching Pic 4 */}
        <div className="p-6 space-y-3 text-xs">
          {/* Currency & Nationality */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Currency & Nationality:</span>
            <span className="font-bold text-slate-800">
              {isForeign
                ? 'Foreign Worker (Paid in USD $)'
                : 'Local Worker (Paid in Dinar IQD)'}
            </span>
          </div>

          {/* Base Salary */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Base Salary:</span>
            <span className="font-medium font-mono text-slate-600">
              {formatMoney(employee.baseSalary, curr, rate)}
            </span>
          </div>

          {/* Arrival Fee (0.05) if active */}
          {(employee.arrivalFee || 0) > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Arrival Fee (5%):</span>
              <span className="font-bold font-mono text-amber-600">
                -{formatMoney(employee.arrivalFee, curr, rate)}
              </span>
            </div>
          )}

          {/* Bonus */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Bonus:</span>
            <span className="font-bold font-mono text-emerald-600">
              +{formatMoney(employee.bonus || 0, curr, rate)}
            </span>
          </div>

          {/* Insurance Deduction */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Insurance Deduction:</span>
            <div className="text-right font-mono">
              {(employee.insurance || 0) > 0 ? (
                isForeign ? (
                  <div>
                    <span className="font-bold text-rose-500">
                      -{formatMoney(employee.insurance, 'USD', rate)}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      ({formatMoney(employee.insuranceIqd || Math.round((employee.insurance || 0) * rate), 'IQD')})
                    </span>
                  </div>
                ) : (
                  <span className="font-bold text-rose-500">
                    -{formatMoney(employee.insurance, 'IQD')}
                  </span>
                )
              ) : (
                <span className="text-slate-400">None (0)</span>
              )}
            </div>
          </div>

          {/* Search Fee */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Search Fee:</span>
            <div className="text-right font-mono">
              {(employee.searchFee || 0) > 0 ? (
                isForeign ? (
                  <div>
                    <span className="font-bold text-amber-600">
                      -{formatMoney(employee.searchFee, 'USD', rate)}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      ({formatMoney(employee.searchFeeIqd || Math.round((employee.searchFee || 0) * rate), 'IQD')})
                    </span>
                  </div>
                ) : (
                  <span className="font-bold text-amber-600">
                    -{formatMoney(employee.searchFee, 'IQD')}
                  </span>
                )
              ) : (
                <span className="text-slate-400">None (0)</span>
              )}
            </div>
          </div>

          {/* Absence */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="text-slate-500 block">Absence:</span>
              {employee.baseSalary > 0 && (employee.absenceDays || 0) > 0 && (
                <span className="text-[10.5px] text-slate-400 font-mono">
                  ({formatMoney(employee.baseSalary / 30, curr, rate)}/day × {employee.absenceDays} days)
                </span>
              )}
            </div>
            <div className="text-right font-mono">
              {(employee.absenceDays || 0) > 0 || (employee.absence || 0) > 0 ? (
                <div>
                  <span className="font-bold text-rose-600">
                    -{formatMoney(employee.absence || ((employee.baseSalary / 30) * (employee.absenceDays || 0)), curr, rate)}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {employee.absenceDays || 0} {employee.absenceDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
              ) : (
                <span className="text-slate-400">None (0 days)</span>
              )}
            </div>
          </div>

          {/* The Net Salary (Highlighted Callout matching Pic 4 & $100 Bill Payout) */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">The Net Salary:</span>
              <span className="text-xl font-black font-mono text-teal-800 tracking-tight">
                {formatMoney(employee.netSalary, curr, rate)}
              </span>
            </div>

            {isForeign && (
              <div className="pt-2 border-t border-emerald-200/60 font-mono text-xs space-y-1.5">
                <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-white/80 border border-emerald-200/80">
                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-[10px] text-slate-500 font-sans font-semibold uppercase tracking-wider block">$100 Dollar Bills</span>
                    <span className="text-sm font-bold text-teal-900">
                      {formatMoney(Math.floor(employee.netSalary / 100) * 100, 'USD', rate)}
                    </span>
                    <span className="text-[10px] text-teal-700 block font-sans">
                      {Math.floor(employee.netSalary / 100)} × $100 bills
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans font-semibold uppercase tracking-wider block">Remainder Payout</span>
                    <span className="text-sm font-bold text-amber-800">
                      +${(employee.netSalary - Math.floor(employee.netSalary / 100) * 100).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold block font-sans">
                      {Math.round((employee.netSalary - Math.floor(employee.netSalary / 100) * 100) * rate).toLocaleString()} IQD
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-600 px-1">
                  <span className="font-sans">Total Equivalent in Dinars:</span>
                  <span className="font-bold text-slate-800">≈ {Math.round(employee.netSalary * rate).toLocaleString()} IQD</span>
                </div>
              </div>
            )}
          </div>

          {/* Salary State */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Salary State:</span>
            <span
              className={`px-3 py-0.5 rounded-full text-[11px] font-bold ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800'
                  : isStopped
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {isPaid ? 'Paid' : isStopped ? 'Stopped' : 'Not Yet'}
            </span>
          </div>

          {/* Date & Time Paid */}
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500">Date & Time Paid:</span>
            <span className="font-mono text-slate-600">
              {isPaid && employee.paidAt ? employee.paidAt : 'Not Paid Yet'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
