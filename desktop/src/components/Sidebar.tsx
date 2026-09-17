import React, { useState, useEffect } from 'react';

export type TabKey = 'dashboard' | 'periods' | 'import' | 'employees' | 'reports' | 'audit' | 'settings';

interface SidebarProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  onNewPayrollRun: () => void;
  onLogout: () => void;
  themeColor?: string;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onNewPayrollRun,
  onLogout,
  themeColor = '#0a0f1d',
  userRole = 'Super Admin',
}) => {
  // Read saved user preferences from localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
  }, [isCollapsed]);

  const isExpanded = !isCollapsed || isHovered;

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const isAuditor = userRole?.toLowerCase().includes('auditor');

  const allNavItems: { key: TabKey; label: string; icon: string; badge?: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'space_dashboard' },
    { key: 'periods', label: 'Payroll Periods', icon: 'calendar_month' },
    { key: 'import', label: 'Excel Ingestion', icon: 'upload_file', badge: 'Live' },
    { key: 'employees', label: 'Staff Roster', icon: 'groups' },
    { key: 'reports', label: 'Financial Reports', icon: 'analytics' },
    { key: 'audit', label: 'Forensic Audit', icon: 'history_edu' },
    { key: 'settings', label: 'System Settings', icon: 'tune' },
  ];

  // Role restriction (Item 19): Fiscal Auditor can ONLY see Dashboard and Staff Roster
  const navItems = isAuditor
    ? allNavItems.filter((i) => i.key === 'dashboard' || i.key === 'employees')
    : allNavItems;

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ backgroundColor: themeColor }}
      className={`hidden md:flex flex-col border-r border-slate-800/80 h-screen left-0 z-50 overflow-y-auto shrink-0 flex-none select-none transition-all duration-300 ease-in-out relative animate-slide-in-left ${isExpanded ? 'w-64' : 'w-20'
        }`}
    >
      {/* Background gradient overlay to ensure readability over any themeColor */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-black/70 pointer-events-none" />

      {/* Brand Header & Prominent Expand/Shrink Toggle (Items 2) */}
      <div className={`relative z-10 p-4 border-b border-slate-800/80 flex items-center justify-between transition-all ${isExpanded ? 'px-5 py-5' : 'px-2 py-4 flex-col gap-3 items-center'
        }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/30 flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">account_balance</span>
          </div>

          {isExpanded && (
            <div className="overflow-hidden whitespace-nowrap animate-fade-in">
              <h1 className="text-base font-black text-white leading-tight tracking-tight">
                Payroll Insight
              </h1>
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                Institutional Pro
              </p>
            </div>
          )}
        </div>

        {/* Prominently Styled Sidebar Controls: Expand/Shrink (Item 2) */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Click to Expand Sidebar' : 'Click to Shrink Sidebar'}
            className={`transition-all duration-200 cursor-pointer flex items-center justify-center ${isCollapsed
                ? 'w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/40 ring-2 ring-white/30 active:scale-95'
                : 'p-2 rounded-xl bg-slate-800/90 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700/80 shadow-sm active:scale-95'
              }`}
          >
            <span className="material-symbols-outlined text-[20px] font-bold">
              {isCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
            </span>
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="relative z-10 flex-1 py-3 flex flex-col gap-1.5 px-3">
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <div key={item.key} className="relative group">
              <button
                onClick={() => setActiveTab(item.key)}
                className={`relative flex items-center w-full transition-all cursor-pointer rounded-2xl ${isExpanded
                    ? 'gap-3.5 py-2.5 px-3.5 text-left text-[13px]'
                    : 'justify-center py-3 px-0'
                  } ${isActive
                    ? 'bg-gradient-to-r from-emerald-500/25 via-teal-500/20 to-emerald-500/10 text-emerald-300 border border-emerald-500/50 shadow-md shadow-emerald-950/50 font-bold'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white border border-transparent font-medium'
                  }`}
              >
                {/* Active Indicator Bar (when expanded) */}
                {isActive && isExpanded && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-r-full" />
                )}

                <span
                  className={`material-symbols-outlined text-[21px] transition-colors flex-shrink-0 ${isActive ? 'text-emerald-400 animate-pulse-slow' : 'text-slate-400 group-hover:text-white'
                    }`}
                >
                  {item.icon}
                </span>

                {isExpanded && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* Floating Tooltip when Shrunk */}
              {!isExpanded && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none hidden group-hover:flex items-center px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white shadow-2xl shadow-black/80 whitespace-nowrap animate-scale-in">
                  <span>{item.label}</span>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Actions & Sign Out (Documentation removed per Item 9) */}
      <div className="relative z-10 mt-auto px-3 py-4 flex flex-col gap-1.5 border-t border-slate-800/80">
        <div className="relative group">
          <button
            type="button"
            onClick={onLogout}
            className={`flex items-center text-rose-400 rounded-2xl hover:bg-rose-500/15 hover:text-rose-300 transition-all w-full text-[13px] font-medium cursor-pointer ${isExpanded ? 'gap-3 py-2.5 px-3 text-left' : 'justify-center py-2.5 px-0'
              }`}
          >
            <span className="material-symbols-outlined text-[19px] flex-shrink-0">logout</span>
            {isExpanded && <span>Sign Out</span>}
          </button>
          {!isExpanded && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none hidden group-hover:flex items-center px-3 py-1.5 rounded-xl bg-slate-900 border border-rose-500/30 text-xs font-bold text-rose-300 shadow-2xl whitespace-nowrap animate-scale-in">
              <span>Sign Out</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
