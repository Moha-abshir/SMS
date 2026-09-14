import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  TrendingUp, Users, UserPlus, CalendarCheck, BookOpen, Calculator,
  ShieldCheck, Settings, FileText, Package, Clock, LogOut,
  ChevronLeft, ChevronRight, Menu, X, School, ClipboardCheck
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { apiClient } from '../lib/apiClient';

export interface NavItem {
  path: string;
  label: string;
  icon: any;
  roles?: string[]; // Allowed roles (if omitted, visible to all)
}

interface SidebarProps {
  user: any;
  onLogout: () => void;
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
    { path: '/mark-review', label: 'Exam Mark Review', icon: ClipboardCheck, roles: ['DEPUTY_HEAD'] },
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
      <div className="lg:hidden sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shrink-0 cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden p-1 shadow-xs shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <School className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block leading-tight truncate">{schoolName}</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">Staff Portal</span>
            </div>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0 w-72 max-w-[85vw] shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Branding Section */}
        <div>
          <div className="p-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden p-1 shadow-xs">
                {logoUrl ? (
                  <img src={logoUrl} alt="School Logo" className="w-full h-full object-contain" />
                ) : (
                  <School className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              {!collapsed && (
                <div className="truncate min-w-0">
                  <h1 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider truncate">
                    {schoolName}
                  </h1>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                    {userRole.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
              >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              {/* Close button inside mobile drawer */}
              <button
                onClick={() => setMobileOpen(false)}
                className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
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
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Actions */}
        <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
          {!collapsed && (
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl flex items-center justify-between gap-2">
              <div className="truncate min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <ThemeToggle />
            </div>
          )}

          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 min-h-[44px] text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all cursor-pointer ${
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
