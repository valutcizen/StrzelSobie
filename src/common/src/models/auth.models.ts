export interface AuthCredentials {
  userId: number;
  passwordHash: string;
}

export interface SessionData {
  userId: number;
  email: string;
  phoneNumber: string | null;
  roles: string[];
  rangeRoles: Record<string, string[]>;
}
