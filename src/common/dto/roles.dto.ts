export interface RoleDto {
  id: number;
  name:string;
  scope: 'global' | 'range';
}

export interface AssignRoleCommand {
  roleId: number;
  rangeId: number | null;
}
