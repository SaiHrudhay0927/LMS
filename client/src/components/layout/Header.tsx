import { Moon, Sun, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/auth/useAuth';
import { useTheme } from '@/lib/theme';
import { useDevUsers } from '@/auth/useDevUsers';
import { NotificationsBell } from './NotificationsBell';

export function Header() {
  const { user, logout, loginAs } = useAuth();
  const { theme, toggle } = useTheme();
  const { data: users } = useDevUsers();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 md:px-6 backdrop-blur">
      <div className="flex-1" />

      {user && users && users.length > 1 && (
        <div className="relative">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span className="hidden sm:inline">Switch user</span>
              <ChevronDown className="h-3 w-3" />
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border/60 bg-popover p-1 shadow-xl z-30 max-h-80 overflow-y-auto scrollbar-thin">
              {users.map((u) => (
                <button
                  key={u._id}
                  onClick={() => loginAs(u.email)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary"
                >
                  <Avatar name={u.fullName} size="sm" />
                  <span className="flex-1 truncate">
                    <span className="block font-medium leading-tight">{u.fullName}</span>
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                      {u.role}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </details>
        </div>
      )}

      <NotificationsBell />

      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {user && (
        <div className="flex items-center gap-3 pl-2 border-l border-border/60 ml-1">
          <Avatar name={user.fullName} size="sm" />
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
