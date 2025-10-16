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

export interface Role {
  id: number;
  name: string;
  scope: 'global' | 'range';
}

export enum UserRole {
  Guest = 'Guest',
  Member = 'Member',
  Coordinator = 'Coordinator',
  Confirmator = 'Confirmator',
  ShootingRangeAdministrator = 'Shooting Range Administrator',
  ClubCommunityAdministrator = 'Club/Community Administrator',
}
