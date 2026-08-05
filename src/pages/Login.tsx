/**
 * Login Page — Bilingual, mobile-first login for Veer Suraksha Grid
 * 
 * Supports:
 *   admin    / admin    → Admin Dashboard
 *   worker1  / worker1  → Worker App (Pranshu Bobade, Red Zone)
 *   worker2  / worker2  → Worker App (Sheel Gaikwad, Yellow Zone)
 *   worker3  / worker3  → Worker App (Aradhya Avhad, Green Zone)
 */
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import smcLogo from '@/assets/smc-logo.png';
import { Shield, User, Lock, Globe, Loader2, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lang, setLang] = useState<'mr' | 'en'>('mr');

  const t = (key: string) => {
    const texts: Record<string, Record<'mr' | 'en', string>> = {
      'title': { mr: 'सोलापूर महानगरपालिका', en: 'Solapur Municipal Corporation' },
      'subtitle': { mr: 'वीर सुरक्षा ग्रिड', en: 'Veer Suraksha Grid' },
      'tagline': { mr: 'स्वच्छता वीर एकात्मिक सुरक्षा व्यवसपीठ', en: 'Swachhata Veer Integrated Safety Platform' },
      'login': { mr: 'लॉगिन करा', en: 'Sign In' },
      'username': { mr: 'वापरकर्तानाव', en: 'Username' },
      'password': { mr: 'पासवर्ड', en: 'Password' },
      'submit': { mr: 'लॉगिन', en: 'Login' },
      'logging_in': { mr: 'लॉगिन होत आहे...', en: 'Signing in...' },
      'admin_hint': { mr: 'प्रशासक: admin / admin', en: 'Admin: admin / admin' },
      'worker_hint': { mr: 'कर्मचारी: worker1, worker2, worker3', en: 'Workers: worker1, worker2, worker3' },
      'error.not_found': { mr: 'वापरकर्ता सापडला नाही', en: 'User not found' },
      'error.invalid': { mr: 'चुकीचा पासवर्ड', en: 'Invalid password' },
      'error.connection': { mr: 'कनेक्शन त्रुटी. पुन्हा प्रयत्न करा.', en: 'Connection error. Please try again.' },
      'lang_toggle': { mr: 'English', en: 'मराठी' },
      'powered': { mr: 'Firebase IoT द्वारा समर्थित', en: 'Powered by Firebase IoT' },
    };
    return texts[key]?.[lang] || key;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setError('');
    setIsSubmitting(true);

    const result = await login(username.trim().toLowerCase(), password.trim());

    if (!result.success) {
      setError(result.error || 'Login failed');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(215,70%,15%)] via-[hsl(215,60%,22%)] to-[hsl(215,50%,28%)] p-4">
      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === 'mr' ? 'en' : 'mr')}
        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 text-xs font-medium transition-all"
      >
        <Globe className="h-3.5 w-3.5" />
        {t('lang_toggle')}
      </button>

      <div className="w-full max-w-md">
        {/* Logo & Title Card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4 shadow-lg shadow-black/20">
            <img src={smcLogo} alt="SMC Logo" className="h-14 w-14 rounded-full" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">{t('title')}</h1>
          <p className="text-sm text-white/60 mt-1">{t('subtitle')}</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <p className="text-xs text-emerald-400/80 font-medium">{t('tagline')}</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/30">
          <h2 className="text-lg font-semibold text-white mb-5 text-center">{t('login')}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">{t('username')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={lang === 'mr' ? 'वापरकर्तानाव प्रविष्ट करा' : 'Enter username'}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  autoComplete="username"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">{t('password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={lang === 'mr' ? 'पासवर्ड प्रविष्ट करा' : 'Enter password'}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error === 'User not found' ? t('error.not_found') : error === 'Invalid password' ? t('error.invalid') : t('error.connection')}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !username.trim() || !password.trim()}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('logging_in')}
                </>
              ) : (
                t('submit')
              )}
            </button>
          </form>

          {/* Hints */}
          <div className="mt-5 pt-4 border-t border-white/5 space-y-1.5 text-center">
            <p className="text-[10px] text-white/30">{t('admin_hint')}</p>
            <p className="text-[10px] text-white/30">{t('worker_hint')}</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-white/20 mt-4">{t('powered')}</p>
      </div>
    </div>
  );
};

export default Login;
