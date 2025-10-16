import { Role } from '../auth/model';

export interface User {
  id: number;
  email: string;
  phone_number: string | null;
  is_deleted: 0 | 1;
  created_at: string;
}

export interface UserProfile extends User {
  roles: Role[];
  range_roles: Record<string, Role[]>;
}

export interface UserGlobalRole {
  user_id: number;
  role_id: number;
}

export interface UserRangeRole {
  user_id: number;
  role_id: number;
  range_id: number;
}
