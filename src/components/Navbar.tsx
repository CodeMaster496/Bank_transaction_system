import React, { useState } from 'react';
import {
  ShieldCheck,
  Bell,
  Sun,
  Moon,
  Radio,
  Users,
  ChevronDown,
  LogOut,
  ExternalLink,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth, DEMO_PROFILES } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { useWebSocket } from '../context/WebSocketContext.tsx';

interface NavbarProps {
  onOpenAuditLogs: () => void;
  onOpenNewTransfer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuditLogs, onOpenNewTransfer }) => {
  const { currentUser, isFirebaseUser, signInWithGoogle, switchDemoUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isConnected, notifications, unreadCount, markAllAsRead, clearNotifications } = useWebSocket();

  const [showDemoDropdown, setShowDemoDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-extrabold text-lg tracking-wider">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans']">
                Apex<span className="text-emerald-500">Vault</span>
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                PostgreSQL Core
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden md:block">
              ACID LEDGER &bull; FAST REAL-TIME TRANSFERS
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center space-x-2 sm:space-x-3">

          {/* WebSocket Status Beacon */}
          <div
            className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}
            title={isConnected ? 'Live WebSocket Connected' : 'Reconnecting WebSocket...'}
          >
            <span className="relative flex h-2 w-2">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="text-[11px] font-semibold">{isConnected ? 'LIVE SYNC' : 'CONNECTING'}</span>
          </div>

          {/* Transfer Button */}
          <button
            onClick={onOpenNewTransfer}
            className="inline-flex items-center justify-center px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
          >
            Send Money
          </button>

          {/* Demo User Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setShowDemoDropdown(!showDemoDropdown);
                setShowNotifDropdown(false);
              }}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              aria-label="Switch User Account"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline font-medium">Switch User</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showDemoDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Select Active Account
                </div>
                <div className="space-y-1 mt-1">
                  {DEMO_PROFILES.map((p) => {
                    const isSelected = currentUser?.email === p.email;
                    return (
                      <button
                        key={p.uid}
                        onClick={() => {
                          switchDemoUser(p.uid);
                          setShowDemoDropdown(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-semibold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <img
                          src={p.avatar}
                          alt={p.fullName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="truncate font-bold">{p.fullName}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{p.accountNumber}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2">
                  <button
                    onClick={onOpenAuditLogs}
                    className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                  >
                    <Lock className="w-3 h-3" />
                    <span>View Audit Logs</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setShowDemoDropdown(false);
                    }}
                    className="text-[11px] text-slate-500 hover:text-rose-500 flex items-center space-x-1"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                setShowDemoDropdown(false);
                if (!showNotifDropdown && unreadCount > 0) {
                  markAllAsRead();
                }
              }}
              className="relative p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Live Notification Feed
                    </span>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No new real-time alerts. Transfer events will stream live here!
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{n.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            aria-label="Toggle dark/light theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Profile / Google Sign In */}
          {!isFirebaseUser ? (
            <button
              onClick={signInWithGoogle}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm cursor-pointer"
              title="Sign in with your Google Account"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google Sign-In</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hidden lg:inline">
                {currentUser?.fullName}
              </span>
              <button
                onClick={logout}
                className="p-1.5 text-xs text-slate-400 hover:text-rose-500 rounded"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
