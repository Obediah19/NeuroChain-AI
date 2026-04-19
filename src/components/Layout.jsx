import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  Map, 
  Brain, 
  FlaskConical, 
  BarChart3, 
  User, 
  LogOut,
  Menu,
  X,
  Network,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const navItems = [
  { path: '/overview', label: 'Command Center', icon: LayoutDashboard },
  { path: '/operations', label: 'Live Operations', icon: Map },
  { path: '/intelligence', label: 'AI Intelligence', icon: Brain },
  { path: '/simulation', label: 'Simulation Lab', icon: FlaskConical },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/profile', label: 'Profile', icon: User },
];

import GlobalChatbot from './GlobalChatbot';

export default function Layout({ children }) {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="h-screen w-screen flex bg-[#f7f7f9] dark:bg-[#1a1a1a] overflow-hidden">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative z-50 h-full
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        transition-all duration-300 ease-in-out
        bg-white dark:bg-[#242424]
        border-r border-gray-200 dark:border-gray-800
        flex flex-col
      `}>
        {/* Logo */}
        <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
              <Network className="text-white" size={22} />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                  NeuroChain <span className="text-blue-500">AI</span>
                </h1>
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 tracking-wide uppercase">Self-Healing Logistics</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 text-gray-500 dark:text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                  ${sidebarCollapsed ? 'justify-center' : ''}
                  ${isActive 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                  }
                `}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span className="font-medium text-sm">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Theme Toggle & Collapse */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Theme</span>
              <button 
                onClick={() => toggleTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`
                  relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none
                  ${theme === 'dark' ? 'bg-[#3b3b3b]' : 'bg-teal-400'}
                `}
              >
                <span className={`
                  ${theme === 'dark' ? 'translate-x-6 bg-teal-400' : 'translate-x-1 bg-white'}
                  inline-block h-5 w-5 transform rounded-full transition duration-300 ease-in-out shadow-sm
                `} />
              </button>
            </div>
          )}
          
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!sidebarCollapsed && <span className="text-xs font-medium">Collapse</span>}
          </button>

          {/* User Info */}
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between px-3 py-2 mt-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{currentUser?.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Commander</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="hidden lg:flex w-full items-center justify-center p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-[#242424] border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-gray-600 dark:text-gray-400"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
            NeuroChain <span className="text-blue-500">AI</span>
          </h1>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </div>
      </main>

      <GlobalChatbot />
    </div>
  );
}