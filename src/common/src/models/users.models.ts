export interface User {
  id: number;
  email: string;
  phone_number: string | null;
  is_deleted: 0 | 1;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  scope: 'global' | 'range';
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
