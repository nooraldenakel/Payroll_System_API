import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Employee } from '../types';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Partial<Employee>) => Promise<void>;
  periodId?: string;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  periodId,
}) => {
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState(`EMP-${Math.floor(100 + Math.random() * 900)}`);
  const [nationalId, setNationalId] = useState(`NAT-${Math.floor(10000000 + Math.random() * 90000000)}`);
  const [department, setDepartment] = useState('طب عام (Medicine)');
  const [position, setPosition] = useState('Assistant Professor');
  const [baseSalary, setBaseSalary] = useState('1200000');
  const [arrivalFee, setArrivalFee] = useState('60000');
  const [bonus, setBonus] = useState('150000');
  const [insurance, setInsurance] = useState('25000');
  const [absenceDays, setAbsenceDays] = useState('0');
  const [absence, setAbsence] = useState('0');
  const [searchFee, setSearchFee] = useState('10000');
  const [bankAccount, setBankAccount] = useState('IQ90-4411-6622-8819');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const base = parseFloat(baseSalary) || 0;
  const arrival = parseFloat(arrivalFee) || 0;
  const bon = parseFloat(bonus) || 0;
  const search = parseFloat(searchFee) || 0;
  const ins = parseFloat(insurance) || 0;
  const absDays = parseInt(absenceDays, 10) || 0;
  const abs = absDays > 0 && base > 0
    ? Math.round((base / 30.0 * absDays) * 100.0) / 100.0
    : (parseFloat(absence) || 0);
  const net = Math.max(0, base + bon - ins - search - abs);

  const handleBaseSalaryChange = (val: string) => {
    setBaseSalary(val);
    const newBase = parseFloat(val) || 0;
    if (absDays > 0 && newBase > 0) {
      setAbsence(String(Math.round((newBase / 30.0 * absDays) * 100.0) / 100.0));
    }
  };

  const handleAbsenceDaysChange = (val: string) => {
    setAbsenceDays(val);
    const days = parseInt(val, 10) || 0;
    if (days > 0 && base > 0) {
      setAbsence(String(Math.round((base / 30.0 * days) * 100.0) / 100.0));
    } else if (days === 0) {
      setAbsence('0');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        fullName,
        employeeCode,
        nationalId,
        department,
        position,
        baseSalary: (!baseSalary.includes('$') && base > 0 && base < 100000) ? base * 1000 : base,
        arrivalFee: arrival,
        bonus: bon,
        insurance: ins,
        absence: abs,
        absenceDays: absDays,
        searchFee: search,
        allowances: bon,
        deductions: ins + abs + search + arrival,
        netSalary: net,
        currency: 'IQD',
        bankAccount,
        status: 'ACTIVE',
        paymentStatus: 'UNPAID',
        periodId,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#004d40] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">Add Single Employee</h3>
              <p className="text-[12px] text-slate-500">
                Enroll institutional faculty member into active payroll ledger
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
          {!periodId && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
              <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
              <span>No active payroll period selected. Please select or create a period before adding staff.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. د. احمد عبد الستار"
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#004d40] focus:bg-white text-slate-900 font-medium placeholder:text-slate-400 text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1">
                Employee Code
              </label>
              <input
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-900 font-medium placeholder:text-slate-400 text-[13px] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1">
                College / Faculty
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium text-[13px] outline-none cursor-pointer"
              >
                <option value="رئاسة الجامعة (Presidency)">رئاسة الجامعة (Presidency)</option>
                <option value="طب عام (Medicine)">طب عام (General Medicine)</option>
                <option value="طب الاسنان (Dentistry)">طب الاسنان (Dentistry)</option>
                <option value="صيدله (Pharmacy)">صيدله (Pharmacy)</option>
                <option value="الهندسه (Engineering)">الهندسه (Engineering)</option>
                <option value="تقنيات هندسيه (Tech Eng)">تقنيات هندسيه (Tech Eng)</option>
                <option value="التربيه (Education)">التربيه (Education)</option>
                <option value="علوم (Science)">علوم (Science)</option>
                <option value="الاداره والاقتصاد (Economics)">الاداره والاقتصاد (Economics)</option>
              </select>
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1">
                Academic Position / Rank
              </label>
              <input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 text-[13px] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Base Salary (IQD) *
              </label>
              <input
                type="number"
                value={baseSalary}
                onChange={(e) => {
                  handleBaseSalaryChange(e.target.value);
                  const b = parseFloat(e.target.value) || 0;
                  setArrivalFee(Math.round(b * 0.05).toString());
                }}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-900 font-medium placeholder:text-slate-400 text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Arrival (0.05)
              </label>
              <input
                type="number"
                value={arrivalFee}
                onChange={(e) => setArrivalFee(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-900 font-medium placeholder:text-slate-400 text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Bonus (IQD)
              </label>
              <input
                type="number"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-900 font-medium placeholder:text-slate-400 text-[13px] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Search Fee (Ded)
              </label>
              <input
                type="number"
                value={searchFee}
                onChange={(e) => setSearchFee(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-900 font-medium placeholder:text-slate-400 text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Insurance (Ded)
              </label>
              <input
                type="number"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-900 font-medium placeholder:text-slate-400 text-[13px] outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11.5px] font-semibold text-slate-700">
                  Absence (Days)
                </label>
                {base > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    IQD {Math.round(base / 30).toLocaleString()}/day
                  </span>
                )}
              </div>
              <input
                type="number"
                min="0"
                value={absenceDays}
                onChange={(e) => handleAbsenceDaysChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-900 font-medium placeholder:text-slate-400 text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Absence (Ded)
              </label>
              <input
                type="number"
                value={absence}
                onChange={(e) => setAbsence(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-900 font-medium placeholder:text-slate-400 text-[13px] outline-none"
              />
            </div>
          </div>

          {/* Computed Net Preview */}
          <div className="bg-[#f0f9f8] border border-[#c6eae3] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">Computed Net Payout</p>
              <p className="text-xl font-black text-[#006a66] font-mono">
                IQD {net.toLocaleString()}
              </p>
            </div>
            <span className="text-[11px] font-mono bg-white text-slate-600 px-3 py-1 rounded-full border border-slate-200">
              ≈ ${(net / 1310).toFixed(0)} USD
            </span>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer text-center justify-center whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !periodId}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-[#004d40] hover:bg-[#00382e] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              {isSubmitting ? (
                <span className="animate-spin material-symbols-outlined text-[17px]">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[17px]">person_add</span>
              )}
              Enroll Employee
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
