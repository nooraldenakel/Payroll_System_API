'use client';

import React, { useState } from 'react';
import { usePayroll, Employee } from '../lib/PayrollContext';

export default function AddEmployeeModal() {
  const { isAddEmployeeModalOpen, setIsAddEmployeeModalOpen, addEmployee, settings } = usePayroll();
  const usdRate = settings.usdToDinarRate || 1310;

  const [name, setName] = useState('');
  const [department, setDepartment] = useState<Employee['department']>('Engineering');
  const [isForeign, setIsForeign] = useState(false);
  const [hasRecruitmentFee, setHasRecruitmentFee] = useState(false);

  // String-based inputs so deleting text clears the input naturally without sticking to 0
  const [baseSalary, setBaseSalary] = useState<string>('8500');
  const [bonus, setBonus] = useState<string>('0');
  const [insurance, setInsurance] = useState<string>('0');
  const [searchingDocFee, setSearchingDocFee] = useState<string>('0');
  const [absenceDays, setAbsenceDays] = useState<string>('0');

  if (!isAddEmployeeModalOpen) return null;

  let numBase = parseFloat(baseSalary) || 0;
  // Rule: If Local employee and base salary is < 20,000, multiply by 1000
  if (!isForeign && numBase > 0 && numBase < 20000) {
    numBase = numBase * 1000;
  }

  const processAmount = (valInput: string): number => {
    const str = valInput.trim();
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
      return Math.round((dinarVal / usdRate) * 100) / 100;
    }
  };

  const numBonus = processAmount(bonus);
  const numInsurance = processAmount(insurance);
  const numDocFee = processAmount(searchingDocFee);
  const numAbsenceDays = parseFloat(absenceDays) || 0;

  const recruitmentFeeDeduct = hasRecruitmentFee ? numBase * 0.05 : 0;
  const effectiveBase = numBase - recruitmentFeeDeduct;
  const dayRate = Math.round(numBase / 30);
  const calculatedAbsenceDeduct = numAbsenceDays * dayRate;
  const netSalaryPreview = Math.max(0, effectiveBase + numBonus - numInsurance - calculatedAbsenceDeduct - numDocFee);
  const currSymbol = isForeign ? '$' : 'IQD ';

  const cleanDollars = Math.floor(netSalaryPreview / 100) * 100;
  const remainderDollars = netSalaryPreview % 100;
  const remainderDinar = remainderDollars * usdRate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'EM';

    // All newly added employees are automatically created as Unpaid (Not Yet)
    addEmployee({
      name,
      initials,
      type: 'Full-Time',
      department,
      baseSalary: numBase,
      searchingDocFee: numDocFee,
      bonus: numBonus,
      insurance: numInsurance,
      absenceDays: numAbsenceDays,
      absenceDeduction: calculatedAbsenceDeduct,
      isForeign,
      currency: isForeign ? 'USD' : 'Dinar',
      hasRecruitmentFee,
      recruitmentFee: recruitmentFeeDeduct,
      salaryState: 'Not Yet',
      paidAt: undefined,
      status: 'Active',
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@institution.gov`,
      phone: '',
      joinDate: new Date().toISOString().split('T')[0],
      paymentStatus: 'Unpaid',
    });

    setIsAddEmployeeModalOpen(false);
    setName('');
    setIsForeign(false);
    setHasRecruitmentFee(false);
    setBaseSalary('8500');
    setBonus('0');
    setInsurance('0');
    setSearchingDocFee('0');
    setAbsenceDays('0');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl p-6 md:p-7 max-w-lg w-full shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setIsAddEmployeeModalOpen(false)}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-primary-container text-white flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-[22px]">person_add</span>
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Add Employee Record</h3>
            <p className="text-xs text-slate-400">Register employee into institution payroll roster (Created as Unpaid).</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              Employee Name (empl name) *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kenneth Ward"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Clean Checkboxes */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isForeign}
                onChange={(e) => setIsForeign(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800">Foreign Employee</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasRecruitmentFee}
                onChange={(e) => setHasRecruitmentFee(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800">Arrival Agency Fee (0.05)</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as Employee['department'])}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
            >
              <option value="Engineering">Engineering</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Finance">Finance</option>
              <option value="Operations">Operations</option>
            </select>
          </div>

          {/* Salary, Bonus, Doc Fee, Insurance, Absence Breakdown with fully clearable number inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                Salary ({isForeign ? 'USD $' : 'IQD'}) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={baseSalary}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes('$') || val.toLowerCase().includes('usd')) {
                    setIsForeign(true);
                  }
                  setBaseSalary(val.replace('$', ''));
                }}
                placeholder="0"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-2 focus:ring-primary/20 outline-none"
              />
              {!isForeign && parseFloat(baseSalary) > 0 && parseFloat(baseSalary) < 20000 && (
                <p className="text-[9px] text-amber-700 font-mono mt-0.5">
                  &lt; 20k ×1,000: <strong>{(parseFloat(baseSalary) * 1000).toLocaleString()} IQD</strong>
                </p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                Bonus ({isForeign ? '$' : 'IQD'})
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-2 focus:ring-primary/20 outline-none"
              />
              {!isForeign && parseFloat(bonus) > 0 && parseFloat(bonus) < 1000 && (
                <p className="text-[9px] text-teal-700 font-mono mt-0.5">
                  &lt; 1k ×1,000: <strong>{(parseFloat(bonus) * 1000).toLocaleString()} IQD</strong>
                </p>
              )}
              {isForeign && parseFloat(bonus) > 0 && !bonus.includes('$') && (
                <p className="text-[9px] text-teal-700 font-mono mt-0.5">
                  Converted: <strong>${(Math.round(((parseFloat(bonus) < 1000 ? parseFloat(bonus) * 1000 : parseFloat(bonus)) / usdRate) * 100) / 100).toLocaleString()}</strong>
                </p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                Search Fee ({isForeign ? '$' : 'IQD'})
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={searchingDocFee}
                onChange={(e) => setSearchingDocFee(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-2 focus:ring-primary/20 outline-none"
              />
              {!isForeign && parseFloat(searchingDocFee) > 0 && parseFloat(searchingDocFee) < 1000 && (
                <p className="text-[9px] text-amber-700 font-mono mt-0.5">
                  &lt; 1k ×1,000: <strong>-{(parseFloat(searchingDocFee) * 1000).toLocaleString()} IQD</strong>
                </p>
              )}
              {isForeign && parseFloat(searchingDocFee) > 0 && !searchingDocFee.includes('$') && (
                <p className="text-[9px] text-amber-700 font-mono mt-0.5">
                  Converted: <strong>-${(Math.round(((parseFloat(searchingDocFee) < 1000 ? parseFloat(searchingDocFee) * 1000 : parseFloat(searchingDocFee)) / usdRate) * 100) / 100).toLocaleString()}</strong>
                </p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                Insurance ({isForeign ? '$' : 'IQD'})
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-2 focus:ring-primary/20 outline-none"
              />
              {!isForeign && parseFloat(insurance) > 0 && parseFloat(insurance) < 1000 && (
                <p className="text-[9px] text-rose-700 font-mono mt-0.5">
                  &lt; 1k ×1,000: <strong>-{(parseFloat(insurance) * 1000).toLocaleString()} IQD</strong>
                </p>
              )}
              {isForeign && parseFloat(insurance) > 0 && !insurance.includes('$') && (
                <p className="text-[9px] text-rose-700 font-mono mt-0.5">
                  Converted: <strong>-${(Math.round(((parseFloat(insurance) < 1000 ? parseFloat(insurance) * 1000 : parseFloat(insurance)) / usdRate) * 100) / 100).toLocaleString()}</strong>
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                Absence (Days)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={absenceDays}
                onChange={(e) => setAbsenceDays(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          {/* Live Net Calculation Preview */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex flex-col justify-center">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-primary font-bold uppercase tracking-wider">The Net Salary (Auto Calculated)</span>
              <span className="text-xl font-black text-primary font-mono">
                {currSymbol}{netSalaryPreview.toLocaleString()}
              </span>
            </div>

            {isForeign && (
              <div className="flex justify-between items-center text-xs font-mono mt-2 pt-2 border-t border-primary/10">
                <span className="text-slate-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  ${cleanDollars.toLocaleString()} Clean Cash ($100s)
                </span>
                <span className="text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  +{remainderDinar.toLocaleString()} IQD Remainder
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddEmployeeModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              Save Employee Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
