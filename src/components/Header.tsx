/**
 * Header — Shows SMC branding, logged-in user info, language toggle, logout
 * No more manual view toggle — role determines the view automatically
 */
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem } from '@/contexts/SystemContext';
import { useAuth } from '@/contexts/AuthContext';
import smcLogo from '@/assets/smc-logo.png';
import { Globe, AlertTriangle, LogOut, User, Shield } from 'lucide-react';

const Header: React.FC = () => {
  const { lang, toggleLang, t } = useLanguage();
  const { activeEmergency } = useSystem();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin';

  return (
    <header className="gov-header px-4 py-2 flex items-center justify-between gap-4 sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-3">
        <img src={smcLogo} alt="SMC Logo" className="h-10 w-10 rounded-full bg-white p-0.5" />
        <div className="leading-tight">
          <h1 className="text-sm font-bold tracking-tight">{t('app.smc')}</h1>
          <p className="text-xs opacity-80">{t('app.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {activeEmergency && (
          <span className="flex items-center gap-1 text-xs font-bold bg-[hsl(var(--sos-red))] px-3 py-1 rounded-full animate-blink">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t('sos.active')}
          </span>
        )}

        {/* Role badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded text-xs">
          {isAdmin ? (
            <>
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-medium">{t('nav.dashboard')}</span>
            </>
          ) : (
            <>
              <User className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-medium">
                {lang === 'mr' ? user?.nameMr : user?.name}
                {user?.zone && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    user.zone === 'red' ? 'bg-red-500/20 text-red-300' :
                    user.zone === 'yellow' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-green-500/20 text-green-300'
                  }`}>
                    {user.zone === 'red' ? (lang === 'mr' ? 'लाल' : 'RED') :
                     user.zone === 'yellow' ? (lang === 'mr' ? 'पिवळा' : 'YELLOW') :
                     (lang === 'mr' ? 'हिरवा' : 'GREEN')}
                  </span>
                )}
              </span>
            </>
          )}
        </div>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors"
        >
          <Globe className="h-3.5 w-3.5" />
          {t('lang.toggle')}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-red-500/30 rounded text-xs font-medium transition-colors"
          title={lang === 'mr' ? 'बाहेर पडा' : 'Logout'}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{lang === 'mr' ? 'बाहेर पडा' : 'Logout'}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
