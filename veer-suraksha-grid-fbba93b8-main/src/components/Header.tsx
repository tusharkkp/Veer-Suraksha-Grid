import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem } from '@/contexts/SystemContext';
import smcLogo from '@/assets/smc-logo.png';
import { Globe, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  view: 'admin' | 'worker';
  onViewChange: (view: 'admin' | 'worker') => void;
}

const Header: React.FC<HeaderProps> = ({ view, onViewChange }) => {
  const { lang, toggleLang, t } = useLanguage();
  const { activeEmergency } = useSystem();

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

        <div className="flex bg-white/10 rounded overflow-hidden text-xs">
          <button
            onClick={() => onViewChange('admin')}
            className={`px-3 py-1.5 transition-colors ${view === 'admin' ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'}`}
          >
            {t('nav.dashboard')}
          </button>
          <button
            onClick={() => onViewChange('worker')}
            className={`px-3 py-1.5 transition-colors ${view === 'worker' ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'}`}
          >
            {t('nav.worker')}
          </button>
        </div>

        <button
          onClick={toggleLang}
          className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors"
        >
          <Globe className="h-3.5 w-3.5" />
          {t('lang.toggle')}
        </button>
      </div>
    </header>
  );
};

export default Header;
