export interface RoleDto {
  id: number;
  name: string;
  scope: 'global' | 'range';
}
