'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePayroll } from '../lib/PayrollContext';

const navItems = [
  { href: '/', icon: 'dashboard', label: 'Dashboard', badge: undefined },
  { href: '/payroll-periods', icon: 'calendar_month', label: 'Payroll Periods', badge: undefined },
  { href: '/excel-import', icon: 'upload_file', label: 'Excel Import', badge: undefined },
  { href: '/employees', icon: 'groups', label: 'Employees', badge: undefined },
  { href: '/reports', icon: 'assessment', label: 'Reports', badge: undefined },
  { href: '/audit-log', icon: 'history', label: 'Audit Log', badge: undefined },
  { href: '/settings', icon: 'settings', label: 'Settings', badge: undefined },
];

export default function Sidebar({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen?: boolean;
  setMobileOpen?: (o: boolean) => void;
}) {
  const pathname = usePathname();
  const {
    setIsNewRunModalOpen,
    sidebarFrozen,
    toggleSidebarFrozen,
    showToast,
  } = usePayroll();

  // Temporary expand on mouse hover when not frozen
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = sidebarFrozen || isHovered;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleToggleFreeze = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHovered(false);
    toggleSidebarFrozen();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen?.(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden animate-fade-in"
        />
      )}

      {/* Spacer div to hold layout width in normal document flow on desktop */}
      <div
        className={`hidden md:block transition-all duration-300 ease-in-out shrink-0 ${
          sidebarFrozen ? 'w-64' : 'w-20'
        }`}
      />

      {/* The Interactive Animated Sidebar */}
      <aside
        onMouseEnter={() => {
          if (!sidebarFrozen) setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (!sidebarFrozen) setIsHovered(false);
        }}
        className={`fixed top-0 left-0 h-screen z-50 flex flex-col shrink-0 bg-white/95 backdrop-blur-md border-r border-slate-200/90 shadow-[4px_0_24px_rgba(0,0,0,0.04)] transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'w-64 shadow-2xl'
            : 'w-20 shadow-sm'
        } ${mobileOpen ? '!translate-x-0 !w-64' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Sleek Floating ">" / "<" Freeze & Shrink Button on the Right Edge */}
        <button
          onClick={handleToggleFreeze}
          title={
            sidebarFrozen
              ? 'Click "<" to unfreeze & shrink sidebar'
              : 'Click ">" to freeze sidebar expanded'
          }
          className={`hidden md:flex absolute -right-3.5 top-6 z-50 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 hover:border-primary ${
            sidebarFrozen
              ? 'text-primary bg-primary/10 border-primary'
              : 'text-slate-600 hover:text-primary hover:bg-slate-50'
          }`}
        >
          <span className="material-symbols-outlined text-[16px] font-black">
            {sidebarFrozen ? 'chevron_left' : 'chevron_right'}
          </span>
        </button>

        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between min-h-[68px]">
          <Link
            href="/"
            prefetch={true}
            className={`flex items-center gap-3 transition-colors ${
              !isExpanded && !mobileOpen ? 'justify-center w-full' : ''
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-teal-800 flex items-center justify-center text-white shadow-md shadow-primary/20 shrink-0">
              <span className="material-symbols-outlined text-[22px]">domain</span>
            </div>
            {(isExpanded || mobileOpen) && (
              <div className="overflow-hidden leading-tight">
                <h1 className="text-sm font-black text-slate-900 tracking-tight whitespace-nowrap">
                  Payroll Insight
                </h1>
                <p className="text-[11px] font-bold text-primary font-mono whitespace-nowrap">
                  Gov Division
                </p>
              </div>
            )}
          </Link>

          {/* Close for mobile */}
          <button
            onClick={() => setMobileOpen?.(false)}
            className="md:hidden text-slate-400 p-1 rounded-lg hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Action: New Payroll Run Button */}
        <div className="p-3">
          <button
            onClick={() => {
              setIsNewRunModalOpen(true);
              setMobileOpen?.(false);
            }}
            title="Start New Payroll Cycle"
            className={`w-full bg-gradient-to-r from-primary to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
              !isExpanded && !mobileOpen ? 'p-2.5 h-10' : 'py-2.5 px-3 h-10'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            {(isExpanded || mobileOpen) && (
              <span className="whitespace-nowrap">New Payroll Run</span>
            )}
          </button>
        </div>

        {/* Nav Items List */}
        <nav className="flex-1 py-2 px-2.5 flex flex-col gap-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const active = isActive(item.href);

            return (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  prefetch={true}
                  onClick={() => setMobileOpen?.(false)}
                  className={`flex items-center gap-3 rounded-xl transition-colors duration-150 ${
                    !isExpanded && !mobileOpen ? 'justify-center p-2.5' : 'px-3.5 py-2.5'
                  } ${
                    active
                      ? 'bg-primary text-white font-bold shadow-sm shadow-primary/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] shrink-0 ${
                      active ? 'fill text-white' : 'text-slate-500 group-hover:text-primary'
                    }`}
                  >
                    {item.icon}
                  </span>

                  {(isExpanded || mobileOpen) && (
                    <span className="text-xs font-medium truncate flex-1">
                      {item.label}
                    </span>
                  )}

                  {(isExpanded || mobileOpen) && item.badge && (
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {item.badge}
                    </span>
                  )}
                </Link>

                {/* Floating Tooltip when Shrunk */}
                {!isExpanded && !mobileOpen && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                    <div className="bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] bg-emerald-500 text-white font-bold px-1 rounded">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -ml-1 border-l border-b border-slate-700" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
