import React, { useState, useEffect } from 'react';

interface StartupAnimationProps {
  onComplete: () => void;
}

export const StartupAnimation: React.FC<StartupAnimationProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(10);
  const [statusText, setStatusText] = useState<string>('Initializing Core Forensic Ledger...');
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(40);
      setStatusText('Loading Faculty & Healthcare Staff Roster...');
    }, 450);

    const t2 = setTimeout(() => {
      setProgress(75);
      setStatusText('Synthesizing Compensation Metrics & Department Allocations...');
    }, 1000);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText('System Ready — Opening Dashboard');
    }, 1500);

    const t4 = setTimeout(() => {
      setIsFadingOut(true);
    }, 1850);

    const t5 = setTimeout(() => {
      onComplete();
    }, 2450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(onComplete, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center select-none transition-all duration-700 ease-out ${
        isFadingOut ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      } bg-gradient-to-br from-[#0c1427] via-[#090e1a] to-[#040810] text-white`}
    >
      {/* Ambient glowing orbs matching Folkd aesthetic */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Skip button in top-right */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute top-6 right-8 text-xs font-mono text-slate-400 hover:text-white px-3 py-1.5 rounded-full border border-slate-700/60 bg-slate-900/60 hover:bg-slate-800 transition-all cursor-pointer z-20 backdrop-blur-md"
      >
        Skip ✕
      </button>

      {/* Main Folkd Animated Brand Showcase */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full">
        {/* Luminous Logo Emblem */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 blur-xl opacity-60 animate-pulse" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#13203c] to-[#1e325c] border border-blue-400/40 flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <span className="material-symbols-outlined text-[48px] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400">
              payments
            </span>
          </div>

          {/* Orbital orbiting ring */}
          <div className="absolute -inset-2 rounded-full border border-blue-400/30 border-dashed animate-spin" style={{ animationDuration: '14s' }} />
        </div>

        {/* Brand Typography */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[11px] font-bold tracking-widest uppercase mb-3 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Institutional Payroll Edition</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
          Payroll Insight Pro
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-sm font-medium">
          Forensic Financial Ledger & Department HR Intelligence
        </p>

        {/* Smooth Progressive Loading Bar */}
        <div className="w-full max-w-xs mt-8 space-y-2">
          <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-sm shadow-emerald-400/50"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
            <span className="truncate pr-2">{statusText}</span>
            <span className="font-bold text-teal-300">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Institutional accreditation footer watermark */}
      <div className="absolute bottom-6 text-[11px] font-mono text-slate-500 tracking-wider">
        SECURE ENTERPRISE RUNTIME • BUILD 2026.09.16
      </div>
    </div>
  );
};
