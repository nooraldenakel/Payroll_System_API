import React from 'react';

interface DeviceConflictModalProps {
  isOpen: boolean;
  message?: string;
  onAcknowledge: () => void;
}

export const DeviceConflictModal: React.FC<DeviceConflictModalProps> = ({
  isOpen,
  message = 'You have been logged in from another device.',
  onAcknowledge,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="device-conflict-modal-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-[32px] p-7 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] text-slate-800 overflow-hidden animate-modal-pop ring-1 ring-black/5">
        {/* Glowing ambient background orbs */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header with Pulsing Warning Emblem */}
        <div className="flex items-start gap-4 mb-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white shadow-xl shadow-amber-500/35 ring-8 ring-amber-100/80 animate-warning-glow flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[32px]">phonelink_lock</span>
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200 ring-1 ring-amber-300/50 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                Active Session Replaced
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-400">1 Device Allowed</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 leading-tight tracking-tight">
              Workstation Locked
            </h3>
          </div>
        </div>

        {/* Warning Callout Box */}
        <div className="p-4 rounded-2xl border-l-4 border-l-amber-500 border-y border-r border-amber-200 bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-white flex items-start gap-3 shadow-2xs mb-5 relative z-10">
          <span className="material-symbols-outlined text-[22px] text-amber-600 shrink-0 mt-0.5">
            warning
          </span>
          <div className="space-y-1">
            <p className="text-sm font-black text-amber-950">
              {message}
            </p>
            <p className="text-xs text-amber-900/80 font-medium leading-relaxed">
              This account was just signed into from another workstation or device.
              To ensure data integrity and avoid conflicting calculations,
              the system strictly permits <strong>one active session</strong> at a time.
            </p>
          </div>
        </div>

        {/* Security Info Card */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 mb-6 text-xs text-slate-600 flex items-start gap-3 relative z-10">
          <span className="material-symbols-outlined text-[18px] text-slate-500 shrink-0 mt-0.5">
            security
          </span>
          <div>
            <span className="font-bold text-slate-900">Security Clearance Notice:</span> Authentication tokens on this computer have been safely revoked. If this wasn't you, notify your IT administrator immediately.
          </div>
        </div>

        {/* Actions */}
        <div className="relative z-10">
          <button
            id="acknowledge-session-conflict-btn"
            type="button"
            onClick={onAcknowledge}
            className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-xs tracking-wide shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            <span>Acknowledge & Return to Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
