import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProviderRoot } from '@/auth/AuthContext';
import { RequireAuth, RequireRole } from '@/auth/guards';
import { AppShell } from '@/components/layout/AppShell';
import { useGlobalSocket } from '@/hooks/useSocket';
import Login from '@/pages/Login';
import Placeholder from '@/pages/Placeholder';

import AdminOverview from '@/pages/admin/Overview';
import AdminBatches from '@/pages/admin/Batches';
import AdminUsers from '@/pages/admin/Users';

import CoordinatorOverview from '@/pages/coordinator/Overview';
import CoordinatorContent from '@/pages/coordinator/Content';
import CoordinatorRoster from '@/pages/coordinator/Roster';

import StudentOverview from '@/pages/student/Overview';
import StudentContent from '@/pages/student/Content';
import StudentRoster from '@/pages/student/Roster';
import StudentRoomsList from '@/pages/student/rooms/List';
import StudentRoomPage from '@/pages/student/rooms/Room';

import DoubtsPage from '@/pages/doubts/DoubtsPage';
import ChatPage from '@/pages/chat/ChatPage';

function GlobalEffects() {
  useGlobalSocket();
  return null;
}

export default function App() {
  return (
    <AuthProviderRoot>
      <GlobalEffects />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          {/* Admin */}
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminOverview />
              </RequireRole>
            }
          />
          <Route
            path="/admin/batches"
            element={
              <RequireRole role="admin">
                <AdminBatches />
              </RequireRole>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireRole role="admin">
                <AdminUsers />
              </RequireRole>
            }
          />

          {/* Coordinator */}
          <Route
            path="/coordinator"
            element={
              <RequireRole role="coordinator">
                <CoordinatorOverview />
              </RequireRole>
            }
          />
          <Route
            path="/coordinator/content"
            element={
              <RequireRole role="coordinator">
                <CoordinatorContent />
              </RequireRole>
            }
          />
          <Route
            path="/coordinator/doubts"
            element={
              <RequireRole role="coordinator">
                <DoubtsPage />
              </RequireRole>
            }
          />
          <Route
            path="/coordinator/roster"
            element={
              <RequireRole role="coordinator">
                <CoordinatorRoster />
              </RequireRole>
            }
          />
          <Route
            path="/coordinator/chat"
            element={
              <RequireRole role="coordinator">
                <ChatPage />
              </RequireRole>
            }
          />

          {/* Student */}
          <Route
            path="/student"
            element={
              <RequireRole role="student">
                <StudentOverview />
              </RequireRole>
            }
          />
          <Route
            path="/student/content"
            element={
              <RequireRole role="student">
                <StudentContent />
              </RequireRole>
            }
          />
          <Route
            path="/student/doubts"
            element={
              <RequireRole role="student">
                <DoubtsPage />
              </RequireRole>
            }
          />
          <Route
            path="/student/roster"
            element={
              <RequireRole role="student">
                <StudentRoster />
              </RequireRole>
            }
          />
          <Route
            path="/student/chat"
            element={
              <RequireRole role="student">
                <ChatPage />
              </RequireRole>
            }
          />
          <Route
            path="/student/rooms"
            element={
              <RequireRole role="student">
                <StudentRoomsList />
              </RequireRole>
            }
          />
          <Route
            path="/student/rooms/:id"
            element={
              <RequireRole role="student">
                <StudentRoomPage />
              </RequireRole>
            }
          />

          <Route path="/settings" element={<Placeholder title="Settings" subtitle="Profile + theme controls live here later." />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProviderRoot>
  );
}
