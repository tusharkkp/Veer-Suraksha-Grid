import React, { useState } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { SystemProvider } from '@/contexts/SystemContext';
import Header from '@/components/Header';
import AdminDashboard from '@/components/AdminDashboard';
import WorkerApp from '@/components/WorkerApp';

const Index: React.FC = () => {
  const [view, setView] = useState<'admin' | 'worker'>('admin');

  return (
    <LanguageProvider>
      <SystemProvider>
        <div className="flex flex-col h-screen overflow-hidden">
          <Header view={view} onViewChange={setView} />
          <main className="flex-1 overflow-hidden">
            {view === 'admin' ? <AdminDashboard /> : <WorkerApp />}
          </main>
        </div>
      </SystemProvider>
    </LanguageProvider>
  );
};

export default Index;
