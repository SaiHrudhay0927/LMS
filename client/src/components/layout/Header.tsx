import { Moon, Sun, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/auth/useAuth';
import { useTheme } from '@/lib/theme';
import { NotificationsBell } from './NotificationsBell';

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 md:px-6 backdrop-blur">
      <div className="flex-1" />

      <NotificationsBell />

      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {user && (
        <div className="flex items-center gap-3 pl-2 border-l border-border/60 ml-1">
          <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
          <div className="hidden sm:block leading-tight">
            <div className="text-sm font-medium">{user.fullName}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {user.role}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </header>
  );
}
