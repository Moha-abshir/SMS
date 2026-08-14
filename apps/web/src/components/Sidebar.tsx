import React, { useState } from 'react';
import {
  TrendingUp, Users, UserPlus, CalendarCheck, BookOpen, Calculator,
  ShieldCheck, Settings, FileText, Package, Calendar, Clock, LogOut,
  ChevronLeft, ChevronRight, Menu, X, School
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

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

  const userRole = user?.roleName || user?.role || 'HEAD_TEACHER';

  // Navigation Items defined per system role
  const allNavItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'settings', label: 'School Settings', icon: Settings, roles: ['HEAD_TEACHER'] },
    { id: 'staff', label: 'Staff Management', icon: Users, roles: ['HEAD_TEACHER', 'DEPUTY_HEAD', 'SECRETARY'] },
    { id: 'admissions', label: 'Admissions & Students', icon: UserPlus, roles: ['HEAD_TEACHER', 'SECRETARY', 'DEPUTY_HEAD'] },
    { id: 'letters', label: 'Official Letters', icon: FileText, roles: ['HEAD_TEACHER'] },
    { id: 'fee_structure', label: 'Fee Structures', icon: Calculator, roles: ['HEAD_TEACHER'] },
    { id: 'allocations', label: 'Class & Teacher Allocations', icon: BookOpen, roles: ['HEAD_TEACHER', 'DEPUTY_HEAD', 'DOS'] },
    { id: 'inventory', label: 'School Inventory', icon: Package, roles: ['HEAD_TEACHER', 'DEPUTY_HEAD'] },
    { id: 'leave_requests', label: 'Teacher Leave-Outs', icon: Clock, roles: ['HEAD_TEACHER', 'DEPUTY_HEAD'] },
    { id: 'examinations', label: 'Examinations & DoS', icon: BookOpen, roles: ['HEAD_TEACHER', 'DEPUTY_HEAD', 'DOS'] },
    { id: 'finance', label: 'Financial Management', icon: Calculator, roles: ['HEAD_TEACHER', 'BURSAR'] },
    { id: 'attendance', label: 'Attendance & Registers', icon: CalendarCheck, roles: ['HEAD_TEACHER', 'DEPUTY_HEAD', 'CLASS_TEACHER', 'SECRETARY'] },
    { id: 'events_meetings', label: 'Calendar & Minutes', icon: Calendar, roles: ['HEAD_TEACHER', 'SECRETARY'] },
    { id: 'audit', label: 'Audit Logs', icon: ShieldCheck, roles: ['HEAD_TEACHER'] },
  ];

  // Filter items based on logged in user role (HEAD_TEACHER has override access)
  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true;
    if (userRole === 'HEAD_TEACHER') return true;
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              EMA
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">Eldoret Muslim Academy</span>
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
              <div className="w-9 h-9 shrink-0 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                <School className="w-5 h-5" />
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="min-w-0">
                  <h2 className="text-xs font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                    Eldoret Muslim Academy
                  </h2>
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded inline-block mt-0.5">
                    {userRole.replace('_', ' ')}
                  </p>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 max-h-[calc(100vh-140px)] overflow-y-auto hide-scrollbar">
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Info & Footer */}
        <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
          {(!collapsed || mobileOpen) && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>
              <div className="hidden lg:block">
                <ThemeToggle />
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors ${
              collapsed && !mobileOpen ? 'justify-center' : ''
            }`}
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-red-500 shrink-0" />
            {(!collapsed || mobileOpen) && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
