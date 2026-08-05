/**
 * Index Page — Entry point with role-based routing
 * 
 * If not authenticated → shows Login page
 * If admin → shows AdminDashboard
 * If worker → shows WorkerApp (locked to their worker ID)
 */
import React from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { SystemProvider } from '@/contexts/SystemContext';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import AdminDashboard from '@/components/AdminDashboard';
import WorkerApp from '@/components/WorkerApp';
import Login from '@/pages/Login';
import { Loader2 } from 'lucide-react';

const Index: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(215,70%,15%)] via-[hsl(215,60%,22%)] to-[hsl(215,50%,28%)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/50 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in → show Login page
  if (!isAuthenticated || !user) {
    return <Login />;
  }

  // Logged in → show the appropriate dashboard
  const view = user.role === 'admin' ? 'admin' : 'worker';

  return (
    <LanguageProvider>
      <SystemProvider>
        <div className="flex flex-col h-screen overflow-hidden">
          <Header />
          <main className="flex-1 overflow-hidden">
            {view === 'admin' ? <AdminDashboard /> : <WorkerApp />}
          </main>
        </div>
      </SystemProvider>
    </LanguageProvider>
  );
};

export default Index;
