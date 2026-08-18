import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, UserPlus, CalendarCheck, BookOpen, Calculator,
  ShieldCheck, Settings, FileText, Package, Clock, LogOut,
  ChevronLeft, ChevronRight, Menu, X, School, ClipboardCheck
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { apiClient } from '../lib/apiClient';

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  roles?: string[]; // Allowed roles (if omitted, visible to all)
}

interface SidebarProps {
  user: any;
  activeView: string;
  onNavigate: (viewId: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeView, onNavigate, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>('Eldoret Muslim Academy');

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
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'settings', label: 'School Settings', icon: Settings, roles: ['HEAD_TEACHER'] },
    { id: 'staff', label: 'Staff Management', icon: Users, roles: ['HEAD_TEACHER', 'SECRETARY'] },
    { id: 'admissions', label: 'Admissions & Students', icon: UserPlus, roles: ['HEAD_TEACHER', 'SECRETARY'] },
    { id: 'letters', label: 'Official Letters', icon: FileText, roles: ['HEAD_TEACHER'] },
    { id: 'fee_structure', label: 'Fee Structures', icon: Calculator, roles: ['HEAD_TEACHER'] },
    { id: 'allocations', label: 'Class & Teacher Allocations', icon: BookOpen, roles: ['DEPUTY_HEAD'] },
    { id: 'inventory', label: 'School Inventory', icon: Package, roles: ['DEPUTY_HEAD'] },
    { id: 'leave_requests', label: 'Teacher Leave-Outs', icon: Clock, roles: ['DEPUTY_HEAD'] },
    { id: 'attendance_oversight', label: 'Attendance Oversight', icon: CalendarCheck, roles: ['HEAD_TEACHER', 'DEPUTY_HEAD', 'SECRETARY'] },
    { id: 'mark_review', label: 'Exam Mark Review', icon: ClipboardCheck, roles: ['DEPUTY_HEAD'] },
    { id: 'subject_analytics', label: 'Subject Performance', icon: TrendingUp, roles: ['HEAD_TEACHER', 'DEPUTY_HEAD', 'DOS'] },
    { id: 'exams', label: 'Exam Timetabling', icon: BookOpen, roles: ['DOS'] },
    { id: 'invigilation', label: 'Invigilator Allocations', icon: ShieldCheck, roles: ['DOS'] },
    { id: 'marking_allocations', label: 'Marking Allocations', icon: BookOpen, roles: ['DOS'] },
    { id: 'report_locks', label: 'Report Card Locks', icon: Settings, roles: ['HEAD_TEACHER', 'DOS'] },
    { id: 'finance', label: 'Financial Management', icon: Calculator, roles: ['HEAD_TEACHER', 'BURSAR'] },
  ];

  // Strictly filter items based on logged in user role (No global override!)
  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden p-1 shadow-sm shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <School className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white block leading-tight">{schoolName}</span>
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
          className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Branding Section */}
        <div>
          <div className="p-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-11 h-11 shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden p-1 shadow-sm">
                {logoUrl ? (
                  <img src={logoUrl} alt="School Logo" className="w-full h-full object-contain" />
                ) : (
                  <School className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              {!collapsed && (
                <div className="truncate">
                  <h1 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider truncate">
                    {schoolName}
                  </h1>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                    {userRole.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileOpen(false);
                  }}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Actions */}
        <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
          {!collapsed && (
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl flex items-center justify-between">
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <ThemeToggle />
            </div>
          )}

          {collapsed && (
            <div className="flex justify-center pb-2">
              <ThemeToggle />
            </div>
          )}

          <button
            onClick={onLogout}
            title={collapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ${
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
