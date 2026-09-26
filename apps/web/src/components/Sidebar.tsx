import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  TrendingUp, Users, UserPlus, CalendarCheck, BookOpen, Calculator,
  ShieldCheck, Settings, FileText, Package, Clock, LogOut,
  Menu, X, School, ClipboardCheck
} from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { ThemeToggle } from './ThemeToggle';

export interface NavItem {
  path: string;
  label: string;
  icon: any;
  roles?: string[]; // Allowed roles (if omitted, visible to all)
}

interface SidebarProps {
  user: any;
  onLogout: () => void;
  activeView?: string;
  onNavigate?: (viewId: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>('Eldoret Muslim Academy');

  const location = useLocation();
  const userRole = user?.roleName || user?.role || 'HEAD_TEACHER';

  useEffect(() => {
    apiClient.get('/api/settings/public').then((res) => {
      if (res.data.data) {
        if (res.data.data.logoUrl) setLogoUrl(res.data.data.logoUrl);
        if (res.data.data.schoolName) setSchoolName(res.data.data.schoolName);
      }
    }).catch(() => {});
  }, []);

  // Strict Navigation Items defined per system role according to blueprint & requirements
  const allNavItems: NavItem[] = [
    { path: '/overview', label: 'Overview', icon: TrendingUp },
    { path: '/settings', label: 'School Settings', icon: Settings, roles: ['HEAD_TEACHER'] },
    { path: '/staff', label: 'Staff Management', icon: Users, roles: ['HEAD_TEACHER', 'SECRETARY'] },
    { path: '/admissions', label: 'Admissions & Students', icon: UserPlus, roles: ['HEAD_TEACHER', 'SECRETARY'] },
    { path: '/letters', label: 'Official Letters', icon: FileText, roles: ['HEAD_TEACHER'] },
    { path: '/fee-structures', label: 'Fee Structures', icon: Calculator, roles: ['HEAD_TEACHER'] },
    { path: '/allocations', label: 'Class & Teacher Allocations', icon: BookOpen, roles: ['DEPUTY_HEAD'] },
    { path: '/inventory', label: 'School Inventory', icon: Package, roles: ['DEPUTY_HEAD'] },
    { path: '/leave-requests', label: 'Teacher Leave-Outs', icon: Clock, roles: ['DEPUTY_HEAD'] },
    { path: '/attendance', label: 'Attendance Oversight', icon: CalendarCheck, roles: ['HEAD_TEACHER', 'DEPUTY_HEAD', 'SECRETARY'] },
    { path: '/class-register', label: 'Daily Class Register', icon: CalendarCheck, roles: ['TEACHER', 'DEPUTY_HEAD', 'HEAD_TEACHER'] },
    { path: '/my-learners', label: 'Class Learners', icon: Users, roles: ['TEACHER', 'DEPUTY_HEAD', 'HEAD_TEACHER'] },
    { path: '/mark-review', label: 'Exam Mark Review', icon: ClipboardCheck, roles: ['DEPUTY_HEAD'] },
    { path: '/marks-entry', label: 'Marksheet Entry', icon: BookOpen, roles: ['TEACHER', 'HEAD_TEACHER', 'DEPUTY_HEAD', 'DOS'] },
    { path: '/subject-performance', label: 'Subject Performance', icon: TrendingUp, roles: ['HEAD_TEACHER', 'DEPUTY_HEAD', 'DOS'] },
    { path: '/exams', label: 'Exam Timetabling', icon: BookOpen, roles: ['DOS'] },
    { path: '/invigilation', label: 'Invigilator Allocations', icon: ShieldCheck, roles: ['DOS'] },
    { path: '/marking-allocations', label: 'Marking Allocations', icon: BookOpen, roles: ['DOS'] },
    { path: '/report-locks', label: 'Report Card Locks', icon: Settings, roles: ['HEAD_TEACHER', 'DOS'] },
    { path: '/finance', label: 'Financial Management', icon: Calculator, roles: ['HEAD_TEACHER', 'BURSAR'] },
  ];

  // Strictly filter items based on logged in user role
  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((role) => {
      if (role === 'DEPUTY_HEAD') {
        return userRole === 'DEPUTY_HEAD' || userRole === 'DEPUTY_HEAD_TEACHER';
      }
      return userRole === role;
    });
  });

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden sticky top-0 z-40 w-full bg-white/85 backdrop-blur-xl border-b border-sky-100 dark:bg-[#081020]/95 dark:border-[#112038] px-3.5 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-[#0d1c38] rounded-xl shrink-0 cursor-pointer transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl border border-sky-100 bg-sky-50/50 dark:border-[#162d50] dark:bg-[#0d1c38]/60 flex items-center justify-center overflow-hidden p-1 shadow-xs shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <School className="w-5 h-5 text-sky-500" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 block leading-tight truncate">{schoolName}</span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold block">Staff Portal</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle variant="icon" />
        </div>
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 z-50 bg-white/85 backdrop-blur-xl border-r border-sky-100/90 dark:bg-[#081020]/95 dark:border-[#112038] flex flex-col h-screen max-h-screen justify-between shadow-glass transition-all duration-300 shrink-0 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0 w-72 max-w-[85vw] shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Branding Section */}
        <div className="shrink-0 border-b border-sky-100/70 dark:border-[#112038]">
          <div className={`p-4 flex items-center transition-all ${collapsed ? 'justify-center' : 'justify-between'}`}>
            <div
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Click to expand sidebar" : "Click to collapse sidebar"}
              className={`flex items-center gap-3 overflow-hidden min-w-0 select-none group/logo ${
                collapsed ? 'cursor-e-resize justify-center' : 'cursor-w-resize flex-1'
              }`}
            >
              <div
                className={`w-10 h-10 shrink-0 rounded-xl border border-sky-100 bg-sky-50/60 dark:border-[#162d50] dark:bg-[#0d1c38]/60 flex items-center justify-center overflow-hidden p-1 shadow-xs transition-all duration-200 group-hover/logo:scale-105 group-hover/logo:border-sky-300 dark:group-hover/logo:border-sky-500 group-hover/logo:shadow-md ${
                  collapsed ? 'cursor-e-resize' : 'cursor-w-resize'
                }`}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="School Logo" className="w-full h-full object-contain pointer-events-none" />
                ) : (
                  <School className="w-5 h-5 text-sky-500" />
                )}
              </div>
              {!collapsed && (
                <div className="truncate min-w-0">
                  <h1 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider truncate group-hover/logo:text-sky-700 dark:group-hover/logo:text-sky-300 transition-colors">
                    {schoolName}
                  </h1>
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 block mt-0.5">
                    {userRole.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>

            {/* Close button inside mobile drawer only */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                title="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto flex-1 min-h-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/overview' && location.pathname === '/');

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[42px] rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 dark:bg-sky-600 dark:shadow-sky-900/30'
                    : 'text-slate-600 hover:bg-sky-50/80 hover:text-sky-700 dark:text-slate-400 dark:hover:bg-[#0d1c38] dark:hover:text-sky-300'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-500 dark:text-slate-500 dark:group-hover:text-sky-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Profile & Actions */}
        <div className="p-3 border-t border-sky-100/70 dark:border-[#112038] space-y-2">
          {/* Theme Mode Switcher */}
          <div className="w-full">
            <ThemeToggle variant={collapsed ? 'icon' : 'pill'} className={collapsed ? 'mx-auto' : ''} />
          </div>

          {!collapsed && (
            <div className="px-3 py-2 bg-sky-50/50 border border-sky-100/70 dark:bg-[#0c1830]/80 dark:border-[#162d50] rounded-xl flex items-center justify-between gap-2">
              <div className="truncate min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 min-h-[44px] text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50/70 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

