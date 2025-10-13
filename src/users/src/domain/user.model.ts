export interface User {
  id: number;
  email: string;
  phone_number: string | null;
  is_deleted: 0 | 1;
  created_at: string;
}
