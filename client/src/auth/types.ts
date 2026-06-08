export type Role = 'admin' | 'coordinator' | 'student';

export interface AuthUser {
  _id: string;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl?: string;
  batchId?: string | null;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface AuthProvider {
  name: string;
  login(payload: { email: string }): Promise<LoginResult>;
}
