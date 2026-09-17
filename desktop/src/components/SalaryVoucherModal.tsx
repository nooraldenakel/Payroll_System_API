import React from 'react';
import { Employee, PayrollPeriod } from '../types';
import { formatMoney } from '../services/api';

interface SalaryVoucherModalProps {
  isOpen: boolean;
  employee: Employee | null;
  period?: PayrollPeriod | null;
  onClose: () => void;
  rate?: number;
}

export const SalaryVoucherModal: React.FC<SalaryVoucherModalProps> = ({
  isOpen,
  employee,
  period,
  onClose,
  rate = 1310,
}) => {
  if (!isOpen || !employee) return null;

  const isForeign = employee.currency === 'USD' || employee.isForeign;
  const curr = isForeign ? 'USD' : 'IQD';
  const isPaid = employee.paymentStatus === 'PAID';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:fixed">
      <div
        className="relative w-full max-w-2xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 px-6 bg-slate-900 text-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Official Salary Disbursement Voucher</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Print Voucher</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 space-y-6 print:p-10 font-sans">
          {/* Institutional Letterhead */}
          <div className="flex items-center justify-between pb-5 border-b-2 border-slate-900">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Institutional Payroll Insight Engine
              </span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                SALARY DISBURSEMENT VOUCHER
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                Cycle: <strong>{period?.name || period?.code || 'August 2026 Cycle 1'}</strong> • Document #{employee.employeeCode || employee.id}
              </p>
            </div>

            <div className="text-right space-y-1">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-teal-400 font-mono font-black text-xl flex items-center justify-center border border-slate-700 shadow-sm ml-auto">
                IQD
              </div>
              <span className="text-[10px] font-mono text-slate-400 block">
                Official Certified Run
              </span>
            </div>
          </div>

          {/* Employee & Cycle Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Staff Member</span>
              <span className="font-bold text-slate-900 text-sm">{employee.fullName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Employee Code</span>
              <span className="font-mono font-bold text-slate-800">{employee.employeeCode || employee.id}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Faculty / Department</span>
              <span className="font-semibold text-slate-800">{employee.department}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Workforce & Currency</span>
              <span className="font-bold text-teal-700">
                {isForeign ? 'Foreign Worker (USD)' : 'Local Worker (IQD)'}
              </span>
            </div>
          </div>

          {/* Itemized Financial Breakdown Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">Line Item / Compensation Component</th>
                  <th className="py-2.5 px-4 text-center">Category</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-800">Base Salary (Contractual)</td>
                  <td className="py-2.5 px-4 text-center text-slate-500">Base Payout</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatMoney(employee.baseSalary, curr, rate)}
                  </td>
                </tr>

                {(employee.bonus || 0) > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 text-slate-800">Allowances & Bonuses</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-semibold">Addition (+)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                      +{formatMoney(employee.bonus, curr, rate)}
                    </td>
                  </tr>
                )}

                {(employee.arrivalFee || 0) > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 text-slate-800">Arrival Agency Fee (0.05 / 5%)</td>
                    <td className="py-2.5 px-4 text-center text-amber-600 font-semibold">Statutory Deduction (-)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-600">
                      -{formatMoney(employee.arrivalFee, curr, rate)}
                    </td>
                  </tr>
                )}

                {(employee.insurance || 0) > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 text-slate-800">
                      <span>Social Insurance & Pension</span>
                      {isForeign && (
                        <span className="text-[11px] text-slate-400 block font-sans">
                          Equivalent: {formatMoney(employee.insuranceIqd || Math.round((employee.insurance || 0) * rate), 'IQD')}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center text-rose-500 font-semibold">Deduction (-)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-500">
                      -{formatMoney(employee.insurance, curr, rate)}
                    </td>
                  </tr>
                )}

                {(employee.searchFee || 0) > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 text-slate-800">
                      <span>Scientific Research & Verification Fee</span>
                      {isForeign && (
                        <span className="text-[11px] text-slate-400 block font-sans">
                          Equivalent: {formatMoney(employee.searchFeeIqd || Math.round((employee.searchFee || 0) * rate), 'IQD')}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center text-amber-600 font-semibold">Deduction (-)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-600">
                      -{formatMoney(employee.searchFee, curr, rate)}
                    </td>
                  </tr>
                )}

                {((employee.absence || 0) > 0 || (employee.absenceDays || 0) > 0) && (
                  <tr>
                    <td className="py-2.5 px-4 text-slate-800">
                      <div>
                        <span>Absence Deduction ({employee.absenceDays || 0} Days)</span>
                        {employee.baseSalary > 0 && (
                          <span className="text-[11px] text-slate-400 block font-mono">
                            ({formatMoney(employee.baseSalary / 30, curr, rate)}/day × {employee.absenceDays || 0} days)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center text-rose-500 font-semibold">Deduction (-)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-500">
                      -{formatMoney(employee.absence || ((employee.baseSalary / 30) * (employee.absenceDays || 0)), curr, rate)}
                    </td>
                  </tr>
                )}

                {/* Net Total Row */}
                <tr className="bg-emerald-50 font-bold border-t-2 border-emerald-400">
                  <td className="py-3.5 px-4 text-emerald-950 text-sm">
                    <div>
                      <span>NET SALARY DISBURSEMENT (PAYOUT)</span>
                      {isForeign && (
                        <span className="text-[11px] text-emerald-700 block font-normal font-sans mt-0.5">
                          Cash Breakdown: <strong>{formatMoney(Math.floor(employee.netSalary / 100) * 100, 'USD', rate)}</strong> ({Math.floor(employee.netSalary / 100)} × $100 bills) + <strong>{Math.round((employee.netSalary - Math.floor(employee.netSalary / 100) * 100) * rate).toLocaleString()} IQD</strong> remainder (≈ {Math.round(employee.netSalary * rate).toLocaleString()} IQD total)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                      {isPaid ? 'DISBURSED' : 'PENDING'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-800 text-base">
                    {formatMoney(employee.netSalary, curr, rate)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Status & Disbursed At */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500">Disbursement Status: </span>
              <strong className={isPaid ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                {isPaid ? 'Paid to Bank Account' : 'Pending Disbursal'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Paid Date & Time: </span>
              <span className="font-mono text-slate-800 font-bold">
                {isPaid && employee.paidAt ? employee.paidAt : '-- Not Paid --'}
              </span>
            </div>
          </div>

          {/* Signatures & Institutional Verification Bar */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-8 text-center text-xs text-slate-600">
            <div className="space-y-8">
              <span className="block font-bold">Prepared By</span>
              <div className="border-b border-dashed border-slate-400 pb-1 font-mono text-[11px] text-slate-500">
                Payroll Officer
              </div>
            </div>

            <div className="space-y-8">
              <span className="block font-bold">Audit & Compliance</span>
              <div className="border-b border-dashed border-slate-400 pb-1 font-mono text-[11px] text-slate-500">
                Audited & Approved
              </div>
            </div>

            <div className="space-y-8">
              <span className="block font-bold">Financial Director</span>
              <div className="border-b border-dashed border-slate-400 pb-1 font-mono text-[11px] text-slate-500">
                Authorized Signature
              </div>
            </div>
          </div>

          {/* Bottom Certified Stamp Note */}
          <div className="pt-2 text-center text-[10px] text-slate-400 font-mono">
            Certified Institutional Document • Generated by Payroll Insight Pro 2.0 • Valid without wet stamp when electronically signed
          </div>
        </div>
      </div>
    </div>
  );
};
