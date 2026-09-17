import React, { useState, useEffect } from 'react';
import { api, getApiUrl, setApiUrl } from '../services/api';
import { UserProfile } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile, isOffline: boolean) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [serverUrl, setServerUrl] = useState<string>(getApiUrl() || 'http://127.0.0.1:8080');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showServerConfig, setShowServerConfig] = useState<boolean>(false);

  // Connection Test State
  const [isTestingConn, setIsTestingConn] = useState<boolean>(false);
  const [connStatus, setConnStatus] = useState<'IDLE' | 'CONNECTED' | 'OFFLINE'>('IDLE');
  const [connMessage, setConnMessage] = useState<string>('');
  const [latency, setLatency] = useState<number | null>(null);

  // Hero Carousel State (3 slides that cycle automatically and respond to dots)
  const [activeSlide, setActiveSlide] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Login State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');

  // Auto-test connection on mount
  useEffect(() => {
    handleTestConnection(serverUrl);
  }, []);

  const handleTestConnection = async (targetUrl: string) => {
    setIsTestingConn(true);
    setConnMessage('Testing connection to backend...');
    const startTime = performance.now();

    try {
      const normalized = targetUrl.trim().replace(/\/+$/, '');
      setApiUrl(normalized);
      const health = await api.checkHealth();
      const elapsed = Math.round(performance.now() - startTime);
      setLatency(elapsed);

      if (health.online) {
        setConnStatus('CONNECTED');
        setConnMessage(`Backend Online (${elapsed}ms) • Ktor SQLite Active`);
      } else {
        setConnStatus('OFFLINE');
        setConnMessage('Backend unreachable. Ensure Ktor API is running on ' + normalized);
      }
    } catch {
      setConnStatus('OFFLINE');
      setConnMessage('Cannot connect to backend server. Please verify port.');
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    try {
      const normalized = serverUrl.trim().replace(/\/+$/, '');
      setApiUrl(normalized);

      // Verify connection to API
      const health = await api.checkHealth();
      if (!health.online) {
        setConnStatus('OFFLINE');
        setLoginError(`Cannot reach API at ${normalized}. Please verify Ktor backend is running.`);
        setIsSubmitting(false);
        return;
      }

      setConnStatus('CONNECTED');

      // Attempt live login via API
      try {
        const user = await api.login(email, password);
        localStorage.setItem('payroll_is_logged_in', 'true');
        onLoginSuccess(user, false);
      } catch (err: any) {
        setLoginError(err.message || 'Invalid institutional credentials. Please check your email and password.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setLoginError(err.message || 'An unexpected error occurred during connection.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#f1f5f9] flex items-center justify-center p-4 sm:p-8 select-none font-sans relative overflow-hidden">
      {/* Soft Ambient Background Iridescent Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-slate-200/40 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Unified Card Container (Matching Image 1) */}
      <div className="max-w-[1180px] w-full min-h-[640px] bg-white rounded-[32px] sm:rounded-[36px] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] border border-slate-200/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 p-3 sm:p-4">

        {/* ======================================================== */}
        {/* LEFT COLUMN: HERO MOCKUP CARD (Matching Image 1)          */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 bg-gradient-to-br from-[#2f394d] via-[#242c3d] to-[#1c2332] text-white rounded-[26px] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-inner">
          {/* Subtle geometric backdrop grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

          {/* Top Brand Emblem */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/40">
                <span className="material-symbols-outlined text-[19px]">bolt</span>
              </div>
              <span className="text-base font-black tracking-tight text-white">Payroll Insight Pro</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">
              v2026.09
            </span>
          </div>

          {/* Hero Headings matching Image 1 with smooth crossfade */}
          <div className="relative z-10 my-6 grid grid-cols-1 grid-rows-1">
            {/* Heading 0 */}
            <div
              className={`col-start-1 row-start-1 space-y-2 transition-all duration-700 ease-in-out ${
                activeSlide === 0
                  ? 'opacity-100 translate-y-0 pointer-events-auto z-10'
                  : 'opacity-0 -translate-y-2 pointer-events-none z-0'
              }`}
            >
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                Keep your Faculty, Healthcare Staff and Cycles on track!
              </h2>
              <p className="text-slate-300 text-xs sm:text-[13px] leading-relaxed max-w-lg font-medium opacity-90">
                Forensic institutional analytics to help payroll directors track insights, attendance cutoffs, and all meaningful compensation data.
              </p>
            </div>

            {/* Heading 1 */}
            <div
              className={`col-start-1 row-start-1 space-y-2 transition-all duration-700 ease-in-out ${
                activeSlide === 1
                  ? 'opacity-100 translate-y-0 pointer-events-auto z-10'
                  : 'opacity-0 -translate-y-2 pointer-events-none z-0'
              }`}
            >
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                Automated Attendance & Forensic Audit Intelligence
              </h2>
              <p className="text-slate-300 text-xs sm:text-[13px] leading-relaxed max-w-lg font-medium opacity-90">
                Continuous oversight of faculty deductions, research honorariums, and clinical arrival fees with strict compliance records.
              </p>
            </div>

            {/* Heading 2 */}
            <div
              className={`col-start-1 row-start-1 space-y-2 transition-all duration-700 ease-in-out ${
                activeSlide === 2
                  ? 'opacity-100 translate-y-0 pointer-events-auto z-10'
                  : 'opacity-0 -translate-y-2 pointer-events-none z-0'
              }`}
            >
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                Multi-Currency Treasury & Instant Salary Vouchers
              </h2>
              <p className="text-slate-300 text-xs sm:text-[13px] leading-relaxed max-w-lg font-medium opacity-90">
                Generate institutional salary clearance vouchers, automated Central Bank USD-to-IQD conversion, and direct electronic wire sheets.
              </p>
            </div>
          </div>

          {/* 3-dot carousel indicator matching Image 1 & 2: auto-rotates and clickable */}
          <div className="flex items-center gap-2 mb-4 relative z-20">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`transition-all duration-500 cursor-pointer ${
                  activeSlide === idx
                    ? 'w-7 h-1.5 rounded-full bg-blue-400 shadow-sm'
                    : 'w-2 h-1.5 rounded-full bg-slate-600 hover:bg-slate-400'
                }`}
                title={`View Slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Floating 3D Dashboard Mockup Cards: 3 Dynamic Visual Previews with Butter-Smooth Grid Crossfade */}
          <div className="relative z-10 mt-auto pt-2 grid grid-cols-1 grid-rows-1">
            {/* SLIDE 0: Institutional Payroll Ledger */}
            <div
              className={`col-start-1 row-start-1 w-full transition-all duration-700 ease-in-out ${
                activeSlide === 0
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto z-10'
                  : 'opacity-0 scale-[0.98] translate-y-1 pointer-events-none z-0'
              }`}
            >
              <div className="w-full bg-white text-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-100/90 transform transition-transform duration-300 hover:-translate-y-1">
                {/* Mini App Header (Active Cycle text removed per user request) */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center text-[12px] font-bold">
                      ⚡
                    </div>
                    <span className="text-xs font-bold text-slate-900">Institutional Ledger</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-slate-500">Live Synchronized</span>
                  </div>
                </div>

                {/* Mini Metric Chips */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[9.5px] text-slate-400 font-semibold uppercase">Total Payroll</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">$352,000</p>
                    <span className="text-[9px] font-bold text-emerald-600">+5.4%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[9.5px] text-slate-400 font-semibold uppercase">Active Staff</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">104</p>
                    <span className="text-[9px] font-bold text-emerald-600">+100%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[9.5px] text-slate-400 font-semibold uppercase">Disbursed</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">$321,800</p>
                    <span className="text-[9px] font-bold text-blue-600">91.4%</span>
                  </div>
                </div>

                {/* Animated Mini Spline Chart with Gradient Fill */}
                <div className="h-16 w-full relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 300 60" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient0" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,45 Q50,20 100,35 T200,22 T300,10 L300,60 L0,60 Z"
                      fill="url(#chartGradient0)"
                    />
                    <path
                      d="M0,45 Q50,20 100,35 T200,22 T300,10"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="flex justify-between text-[8.5px] font-mono text-slate-400 pt-1">
                    <span>Jan</span>
                    <span>Mar</span>
                    <span>May</span>
                    <span>Jul</span>
                    <span>Sep</span>
                    <span>Nov</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SLIDE 1: Faculty Attendance & Forensic Compliance */}
            <div
              className={`col-start-1 row-start-1 w-full transition-all duration-700 ease-in-out ${
                activeSlide === 1
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto z-10'
                  : 'opacity-0 scale-[0.98] translate-y-1 pointer-events-none z-0'
              }`}
            >
              <div className="w-full bg-white text-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-100/90 transform transition-transform duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[12px] font-bold">
                      ✓
                    </div>
                    <span className="text-xs font-bold text-slate-900">Attendance & Compliance Audit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Zero Flags
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[9.5px] text-slate-400 font-semibold uppercase">Attendance</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">99.2%</p>
                    <span className="text-[9px] font-bold text-emerald-600">Nominal</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[9.5px] text-slate-400 font-semibold uppercase">Deductions</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">$0.00</p>
                    <span className="text-[9px] font-bold text-emerald-600">Zero Loss</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[9.5px] text-slate-400 font-semibold uppercase">Ledger Lock</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">100%</p>
                    <span className="text-[9px] font-bold text-teal-600">Verified</span>
                  </div>
                </div>

                {/* Progress Bars for Departments */}
                <div className="space-y-2 py-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                      <span>College of Medicine (Foreign Faculty)</span>
                      <span className="font-mono text-emerald-600">100% Cleared</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full w-full" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                      <span>Dentistry & Pharmacy (Local Staff)</span>
                      <span className="font-mono text-blue-600">98.5% Cleared</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full w-[98.5%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SLIDE 2: Multi-Currency Treasury & Disbursement */}
            <div
              className={`col-start-1 row-start-1 w-full transition-all duration-700 ease-in-out ${
                activeSlide === 2
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto z-10'
                  : 'opacity-0 scale-[0.98] translate-y-1 pointer-events-none z-0'
              }`}
            >
              <div className="w-full bg-white text-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-100/90 transform transition-transform duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[12px] font-bold">
                      🏛️
                    </div>
                    <span className="text-xs font-bold text-slate-900">Treasury & Currency Settlement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      Dual-Currency FX
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[9.5px] text-slate-400 font-semibold uppercase">USD Outflow</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">$184,200</p>
                    <span className="text-[9px] font-bold text-indigo-600">Foreign Staff</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[9.5px] text-slate-400 font-semibold uppercase">IQD Outflow</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">241M IQD</p>
                    <span className="text-[9px] font-bold text-emerald-600">Local Staff</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[9.5px] text-slate-400 font-semibold uppercase">Vouchers</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">104 / 104</p>
                    <span className="text-[9px] font-bold text-blue-600">Generated</span>
                  </div>
                </div>

                {/* Direct Bank Wire Staging bar */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="font-bold text-slate-800 text-[11px]">Direct Bank Wire Staging</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-[10px] font-mono font-bold text-indigo-700 shadow-2xs">
                    Batch Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: LOGIN FORM & TEST CONNECTION (5 Cols)      */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Institutional Access
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                Enter your authorized credentials to access faculty and healthcare payroll.
              </p>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-shake">
                <span className="material-symbols-outlined text-[18px] shrink-0 text-rose-500">error</span>
                <span className="font-semibold leading-tight">{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email / Officer ID */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 tracking-wide">
                  Email / Officer ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your institutional email or ID"
                    style={{ color: '#0f172a', WebkitTextFillColor: '#0f172a' }}
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-white border border-slate-300 !text-slate-900 font-bold text-sm placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 transition-all shadow-xs"
                  />
                  <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">
                    person
                  </span>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 tracking-wide">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{ color: '#0f172a', WebkitTextFillColor: '#0f172a' }}
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-white border border-slate-300 !text-slate-900 font-bold text-sm placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ring-0 border-0 shadow-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[20px] outline-none select-none">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Must be at least 6 characters.</p>
              </div>

              {/* Primary Action Button matching Image 1: Vibrant Royal Blue */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs tracking-wide shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Payroll Pro</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Test Connecting Section (User requested: "remove google sign in, only main and pass and test connecting") */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleTestConnection(serverUrl)}
                  disabled={isTestingConn}
                  className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-2xs active:scale-95"
                >
                  <span
                    className={`material-symbols-outlined text-[16px] text-blue-600 ${
                      isTestingConn ? 'animate-spin' : ''
                    }`}
                  >
                    sync
                  </span>
                  <span>{isTestingConn ? 'Pinging API...' : 'Test Connection'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowServerConfig(!showServerConfig)}
                  className="text-[11px] text-slate-400 hover:text-blue-600 font-medium underline cursor-pointer"
                >
                  {showServerConfig ? 'Hide URL' : 'Configure Server'}
                </button>
              </div>

              {/* Connection Status Badge */}
              <div
                className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
                  connStatus === 'CONNECTED'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : connStatus === 'OFFLINE'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connStatus === 'CONNECTED'
                        ? 'bg-emerald-500 animate-pulse'
                        : connStatus === 'OFFLINE'
                        ? 'bg-rose-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="truncate text-[11px] font-sans font-bold">
                    {connMessage || 'Server status unverified'}
                  </span>
                </div>
                {latency !== null && connStatus === 'CONNECTED' && (
                  <span className="text-[10px] font-bold text-emerald-700 shrink-0 ml-1">
                    {latency}ms
                  </span>
                )}
              </div>

              {/* Expandable Server URL Configuration */}
              {showServerConfig && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 animate-fade-in">
                  <label className="block text-[11px] font-bold text-slate-600">Backend Ktor API URL:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://127.0.0.1:8080"
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleTestConnection(serverUrl)}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
