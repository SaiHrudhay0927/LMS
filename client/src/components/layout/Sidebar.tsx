import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Layers,
  MessageSquare,
  MessagesSquare,
  HelpCircle,
  BookOpen,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = 'admin' | 'coordinator' | 'student';

const NAV: Record<Role, { to: string; label: string; icon: React.ComponentType<any> }[]> = {
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/batches', label: 'Batches', icon: Layers },
    { to: '/admin/users', label: 'Users', icon: Users },
  ],
  coordinator: [
    { to: '/coordinator', label: 'Overview', icon: LayoutDashboard },
    { to: '/coordinator/content', label: 'Content', icon: BookOpen },
    { to: '/coordinator/doubts', label: 'Doubts', icon: HelpCircle },
    { to: '/coordinator/roster', label: 'Roster', icon: Users },
    { to: '/coordinator/chat', label: 'Messages', icon: MessageSquare },
  ],
  student: [
    { to: '/student', label: 'Overview', icon: LayoutDashboard },
    { to: '/student/content', label: 'Content', icon: BookOpen },
    { to: '/student/doubts', label: 'My Doubts', icon: HelpCircle },
    { to: '/student/rooms', label: 'Study Rooms', icon: MessagesSquare },
    { to: '/student/roster', label: 'Batchmates', icon: Users },
    { to: '/student/chat', label: 'Messages', icon: MessageSquare },
  ],
};

const ROLE_ACCENT: Record<Role, string> = {
  admin: 'from-fuchsia-500 to-brand-500',
  coordinator: 'from-brand-500 to-sky-500',
  student: 'from-brand-500 to-emerald-500',
};

export function Sidebar({ role }: { role: Role }) {
  const items = NAV[role];
  const roleTitle = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col border-r border-border/60 bg-card/40 backdrop-blur">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-border/60">
        <div
          className={cn(
            'grid place-items-center h-9 w-9 rounded-lg bg-gradient-to-br text-white shadow-md shadow-primary/30',
            ROLE_ACCENT[role],
          )}
        >
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="font-bold tracking-tight">Pulse LMS</div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {roleTitle}
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === `/${role}`}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-lg bg-primary/10 ring-1 ring-primary/20"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <it.icon className="relative h-4 w-4 shrink-0" />
                <span className="relative">{it.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border/60">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/70"
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
