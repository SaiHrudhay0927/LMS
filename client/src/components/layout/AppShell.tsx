import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/auth/useAuth';
import { AIChatWidget } from '@/components/ai/AIChatWidget';

export function AppShell() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
          <Outlet />
        </main>
      </div>
      {user.role === 'student' && <AIChatWidget />}
    </div>
  );
}
