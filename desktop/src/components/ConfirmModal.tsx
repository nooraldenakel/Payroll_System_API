import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface EmployeeContextInfo {
  name: string;
  id: string;
  baseSalary?: number;
  netSalary?: number;
  status?: string;
  currency?: string;
}

export interface ContextDetailItem {
  label: string;
  value: string;
  badge?: boolean;
  highlight?: boolean;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  badgeLabel?: string;
  bulletPoints?: string[];
  contextDetails?: ContextDetailItem[];
  employeeDetails?: EmployeeContextInfo;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm & Proceed',
  cancelText = 'Cancel',
  variant = 'warning',
  badgeLabel,
  bulletPoints,
  contextDetails,
  employeeDetails,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const defaultBadge = isDanger
    ? 'Critical Action Required'
    : isWarning
    ? 'Clearance & Safety Warning'
    : 'System Confirmation';

  const modalNode = (
    <div
      id="confirm-dialog-backdrop"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'confirm-dialog-backdrop') {
          onCancel();
        }
      }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md select-none animate-fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-[32px] border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] p-6 sm:p-8 text-slate-800 overflow-hidden animate-modal-pop ring-1 ring-black/5 my-auto">
        {/* Ambient Top Glow */}
        <div
          className={`absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl pointer-events-none ${
            isDanger
              ? 'bg-rose-500/20'
              : isWarning
              ? 'bg-amber-500/25'
              : 'bg-teal-500/20'
          }`}
        />
        <div
          className={`absolute -bottom-24 -left-24 w-52 h-52 rounded-full blur-3xl pointer-events-none ${
            isDanger
              ? 'bg-rose-500/10'
              : isWarning
              ? 'bg-amber-500/10'
              : 'bg-teal-500/10'
          }`}
        />

        {/* Top Header with Pulsing Glow Emblem */}
        <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-5 relative z-10">
          <div
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-all ${
              isDanger
                ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-rose-500/30 ring-4 sm:ring-8 ring-rose-100/80 animate-danger-glow'
                : isWarning
                ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white shadow-amber-500/30 ring-4 sm:ring-8 ring-amber-100/80 animate-warning-glow'
                : 'bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 text-white shadow-teal-500/30 ring-4 sm:ring-8 ring-teal-100/80'
            }`}
          >
            <span className="material-symbols-outlined text-[24px] sm:text-[32px]">
              {isDanger ? 'error' : isWarning ? 'warning' : 'verified_user'}
            </span>
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider mb-1 sm:mb-1.5 border shadow-2xs ${
                isDanger
                  ? 'bg-rose-50 text-rose-800 border-rose-200/90 ring-1 ring-rose-300/50'
                  : isWarning
                  ? 'bg-amber-50 text-amber-900 border-amber-200/90 ring-1 ring-amber-300/50'
                  : 'bg-teal-50 text-teal-800 border-teal-200/90 ring-1 ring-teal-300/50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
              {badgeLabel || defaultBadge}
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug tracking-tight">
              {title}
            </h3>
          </div>
        </div>

        {/* Warning Callout Box */}
        <div
          className={`relative z-10 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border mb-4 sm:mb-5 flex items-start gap-2.5 sm:gap-3 shadow-2xs ${
            isDanger
              ? 'bg-gradient-to-r from-rose-50/90 via-rose-50/50 to-white border-l-4 border-l-rose-600 border-y-rose-200 border-r-rose-200 text-rose-950'
              : isWarning
              ? 'bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-white border-l-4 border-l-amber-500 border-y-amber-200 border-r-amber-200 text-amber-950'
              : 'bg-gradient-to-r from-teal-50/90 via-teal-50/50 to-white border-l-4 border-l-teal-600 border-y-teal-200 border-r-teal-200 text-teal-950'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[20px] sm:text-[22px] shrink-0 mt-0.5 ${
              isDanger
                ? 'text-rose-600'
                : isWarning
                ? 'text-amber-600'
                : 'text-teal-600'
            }`}
          >
            {isDanger ? 'dangerous' : isWarning ? 'shield_with_heart' : 'info'}
          </span>
          <p className="text-xs sm:text-sm leading-relaxed font-medium">
            {message}
          </p>
        </div>

        {/* Optional Bullet Points / Impact Consequences */}
        {bulletPoints && bulletPoints.length > 0 && (
          <div className="mb-4 sm:mb-5 p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-2 relative z-10">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
              Governance Impact Notice:
            </span>
            <ul className="space-y-1.5 text-slate-600 font-medium">
              {bulletPoints.map((bp, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[15px] text-amber-600 shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <span>{bp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optional Context Details (Key-Value) */}
        {contextDetails && contextDetails.length > 0 && (
          <div className="mb-4 sm:mb-5 p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-2 font-mono relative z-10">
            {contextDetails.map((cd, idx) => (
              <div key={idx} className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-sans">{cd.label}:</span>
                {cd.badge ? (
                  <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    {cd.value}
                  </span>
                ) : (
                  <span className={`font-bold ${cd.highlight ? 'text-teal-800' : 'text-slate-900'}`}>
                    {cd.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Optional Employee Context Card */}
        {employeeDetails && (
          <div className="mb-4 sm:mb-5 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 font-mono shadow-2xs relative z-10">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans font-medium">Staff Member:</span>
              <span className="font-black text-slate-900 font-sans text-[13px]">{employeeDetails.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans font-medium">Employee Code:</span>
              <span className="font-bold text-teal-800 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200">
                {employeeDetails.id}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans font-medium">Current Status:</span>
              <span className="px-2 py-0.5 rounded-md text-[10.5px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                {employeeDetails.status || 'UNPAID'}
              </span>
            </div>
            {employeeDetails.baseSalary !== undefined && (
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-xs">
                <span className="text-slate-400 font-sans font-medium text-[11px]">Base Salary:</span>
                <span className="font-mono font-medium text-slate-600 text-xs">
                  ${employeeDetails.baseSalary.toLocaleString()} {employeeDetails.currency || ''}
                </span>
              </div>
            )}
            {employeeDetails.netSalary !== undefined && (
              <div className="flex justify-between items-center pt-2 border-t border-emerald-200/80">
                <span className="text-emerald-950 font-sans font-black text-xs">Net Payout Salary:</span>
                <span className="font-black font-mono text-emerald-950 text-sm px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-300 shadow-2xs">
                  ${employeeDetails.netSalary.toLocaleString()} {employeeDetails.currency || ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons & Keyboard Hints */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pt-4 border-t border-slate-100 relative z-10">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700 shadow-2xs">
              Esc
            </kbd>
            <span>to cancel</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-initial min-w-[120px] px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 text-center justify-center whitespace-nowrap"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 sm:flex-initial min-w-[130px] px-6 py-2.5 rounded-xl text-white text-xs font-black transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap ${
                isDanger
                  ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 hover:from-rose-700 hover:to-rose-900 shadow-rose-600/30'
                  : isWarning
                  ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 shadow-amber-500/30 text-white'
                  : 'bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 shadow-teal-700/30'
              }`}
            >
              <span className="material-symbols-outlined text-[17px] shrink-0">
                {isDanger ? 'delete_forever' : isWarning ? 'check_circle' : 'task_alt'}
              </span>
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalNode, document.body)
    : modalNode;
};
