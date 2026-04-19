import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  User, 
  Mail, 
  Shield, 
  Moon, 
  Sun, 
  Monitor,
  Settings,
  LogOut,
  Bell,
  Lock,
  Globe
} from 'lucide-react';

function SettingRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Icon size={20} className="text-gray-500 dark:text-gray-400" />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      {children}
    </div>
  );
}

function ThemeButton({ mode, icon: Icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 p-4 rounded-xl border-2 transition-all
        ${isActive 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${
        isActive ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'
      }`}>
        <Icon size={24} className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
      </div>
      <p className={`text-sm font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
        {label}
      </p>
    </button>
  );
}

export default function Profile() {
  const { currentUser, logout, changePassword } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ type: '', msg: '' });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus({ type: 'error', msg: 'Password must be at least 6 characters' });
      return;
    }
    try {
      await changePassword(newPassword);
      setPasswordStatus({ type: 'success', msg: 'Password updated successfully!' });
      setIsChangingPassword(false);
      setNewPassword('');
    } catch (err) {
      if(err.code === 'auth/requires-recent-login') {
        setPasswordStatus({ type: 'error', msg: 'Session expired. Please sign out and sign in again.' });
      } else {
        setPasswordStatus({ type: 'error', msg: err.message || 'Failed to update password' });
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          Profile
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* User Info */}
      <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <User size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {currentUser?.email?.split('@')[0] || 'Commander'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Mail size={14} />
                {currentUser?.email}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                  <Shield size={12} className="inline mr-1" />
                  Agent Commander
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <SettingRow icon={Mail} label="Email">
            <span className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.email}</span>
          </SettingRow>
          <SettingRow icon={Shield} label="Role">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Agent Commander</span>
          </SettingRow>
          <SettingRow icon={Globe} label="Region">
            <span className="text-sm text-gray-500 dark:text-gray-400">India</span>
          </SettingRow>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Settings size={20} className="text-blue-500" />
            Appearance
          </h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose your preferred theme</p>
          <div className="grid grid-cols-3 gap-3">
            <ThemeButton
              mode="light"
              icon={Sun}
              label="Light"
              isActive={theme === 'light'}
              onClick={() => toggleTheme('light')}
            />
            <ThemeButton
              mode="dark"
              icon={Moon}
              label="Dark"
              isActive={theme === 'dark'}
              onClick={() => toggleTheme('dark')}
            />
            <ThemeButton
              mode="system"
              icon={Monitor}
              label="System"
              isActive={theme === 'system'}
              onClick={() => toggleTheme('system')}
            />
          </div>
        </div>
      </div>

      {/* App Settings */}
      <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bell size={20} className="text-blue-500" />
            Notifications
          </h3>
        </div>
        <div className="p-4">
          <SettingRow icon={Bell} label="Push Notifications">
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors">
              <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
            </button>
          </SettingRow>
          <SettingRow icon={Mail} label="Email Alerts">
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500 transition-colors">
              <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
            </button>
          </SettingRow>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Lock size={20} className="text-blue-500" />
            Security
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {!isChangingPassword ? (
            <button onClick={() => setIsChangingPassword(true)} className="w-full py-3 px-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Change Password</span>
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex items-center gap-2">
                <button type="submit" className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition-colors">
                  Save
                </button>
                <button type="button" onClick={() => { setIsChangingPassword(false); setPasswordStatus({ type: '', msg: '' }); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {passwordStatus.msg && (
             <div className={`p-3 text-sm rounded-lg border ${passwordStatus.type === 'error' ? 'bg-red-50 text-red-500 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                {passwordStatus.msg}
             </div>
          )}

          <button className="w-full py-3 px-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors opacity-50 cursor-not-allowed">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Two-Factor Authentication (Coming Soon)</span>
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors flex items-center justify-center gap-2"
      >
        <LogOut size={20} />
        Sign Out
      </button>

      {/* Version Info */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>NeuroChain AI v1.0.0</p>
        <p className="text-xs mt-1">Powered by Google Gemini & Firebase</p>
      </div>
    </div>
  );
}