export interface AuthUserDTO {
  _id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'coordinator' | 'student';
  avatarUrl?: string;
  batchId?: string | null;
}

export interface AuthLoginResult {
  token: string;
  user: AuthUserDTO;
}

export interface AuthProvider {
  name: string;
  /**
   * Resolve a login payload to a verified email address that we can look up
   * in our users collection. Mock just trusts the email; Google would verify
   * the ID token first and return the email it contains.
   */
  resolveEmail(payload: any): Promise<string>;
}
