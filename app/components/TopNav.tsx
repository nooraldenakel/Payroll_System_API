'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePayroll } from '../lib/PayrollContext';
import Link from 'next/link';

interface TopNavProps {
  title?: string;
  onMenuClick?: () => void;
}

export default function TopNav({ title, onMenuClick }: TopNavProps) {
  const {
    searchQuery,
    setSearchQuery,
    auditLogs,
    showToast,
    sidebarCollapsed,
    sidebarHidden,
    toggleSidebarCollapse,
    toggleSidebarHide,
  } = usePayroll();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white/85 backdrop-blur-md flex justify-between items-center w-full px-4 md:px-6 h-16 z-40 shrink-0 sticky top-0 border-b border-slate-200/80 shadow-2xs">
      {/* Mobile Menu Button (hidden on desktop) */}
      <button
        onClick={onMenuClick}
        className="md:hidden text-slate-600 mr-3 p-1.5 -ml-1 rounded-xl hover:bg-slate-100 transition-colors"
      >
        <span className="material-symbols-outlined text-[22px]">menu</span>
      </button>



      {/* Brand (Mobile Only) */}
      <div className="md:hidden flex-1">
        <h1 className="text-sm font-bold text-primary truncate">
          {title || 'Institution Payroll'}
        </h1>
      </div>

      {/* Search (Desktop Only) */}
      {title ? (
        <div className="hidden md:flex items-center gap-3">
          <h1 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h1>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 max-w-md relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-xl text-xs font-medium transition-all outline-none text-slate-800 placeholder:text-slate-400"
            placeholder="Search employees, payroll runs..."
            type="text"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      )}

      {/* Right side icons & user profile */}
      <div className="flex items-center gap-3 md:gap-4 ml-auto">
        {/* Notification Button */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-on-surface-variant rounded-full hover:bg-surface-container-low transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full shadow-[0_0_0_2px_#f7fafc]"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-surface-container-low overflow-hidden z-50 animate-fade-in">
              <div className="p-4 border-b border-surface-container-low flex justify-between items-center bg-surface-container-lowest">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">notifications_active</span>
                  <h4 className="text-body-sm font-body-sm font-bold text-on-surface">Recent Activity</h4>
                </div>
                <span className="text-label-sm font-label-sm bg-primary-container/10 text-primary font-bold px-2 py-0.5 rounded-full">
                  {auditLogs.length} events
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-surface-container-low">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-3.5 hover:bg-surface-container-low transition-colors flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-surface-container-low text-on-surface-variant flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">{log.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-body-sm font-body-sm font-semibold text-on-surface truncate">{log.action}</p>
                        <span className="text-label-sm font-label-sm text-on-surface-variant shrink-0">{log.time}</span>
                      </div>
                      <p className="text-[12px] text-on-surface-variant line-clamp-2 mt-0.5">{log.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-surface-container-low bg-surface-container-lowest text-center">
                <Link
                  href="/audit-log"
                  onClick={() => setShowNotifications(false)}
                  className="text-body-sm font-body-sm text-primary font-semibold hover:underline"
                >
                  View Full Audit Log →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div className="h-8 w-px bg-gradient-to-b from-transparent via-outline-variant/50 to-transparent mx-2 hidden md:block"></div>

        {/* Profile Pill */}
        <div className="relative" ref={profileRef}>
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity bg-white pl-2 pr-4 py-1.5 rounded-full shadow-sm"
          >
            <img
              alt="Aziz Sulaiman"
              className="w-9 h-9 rounded-full object-cover shadow-sm"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoiRh3eQaDLcXrAwZtufTFkdWBtiPl5gIGk_L_W10YXtikhpFyilEUWxkDy8KRXXrVqXZoU2i6OICU2vnxfhqXGvV8jcmDZFUnFv0ANsSvOa2nznxecHXHYXrctk7C-4Wd27wB4QCHqgRlkYVM7OYt_YCDH7baMZHWRidBALHtUVWTbOUFnhAP5NOUhLDAIDxPIXJWTNerASlUaHvR9z3SWljzc8q18BFqvdn6dm0_v68Gx4ZLGOw9UA"
            />
            <div className="hidden lg:block text-right">
              <p className="text-body-sm font-body-sm font-semibold text-on-surface leading-tight">Aziz Sulaiman</p>
              <p className="text-[11px] font-label-sm text-on-surface-variant">Admin Officer</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant hidden md:block text-[20px]">
              arrow_drop_down
            </span>
          </div>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-surface-container-low py-2 z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-surface-container-low">
                <p className="text-body-sm font-body-sm font-bold text-on-surface">Aziz Sulaiman</p>
                <p className="text-label-sm font-label-sm text-on-surface-variant">aziz@institution.gov</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-label-sm font-label-sm font-bold bg-primary-container/10 text-primary">
                  Super Admin
                </span>
              </div>
              <Link
                href="/settings"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-body-sm font-body-sm text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">manage_accounts</span>
                Account Settings
              </Link>
              <Link
                href="/audit-log"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-body-sm font-body-sm text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">history</span>
                My Activity
              </Link>
              <div className="border-t border-surface-container-low my-1" />
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  showToast('Session Active', 'Logged in as Aziz Sulaiman (Admin Officer).', 'info');
                }}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-body-sm font-body-sm text-error hover:bg-error-container/20 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
