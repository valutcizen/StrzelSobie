export interface RoleDto {
    id: number;
    name:string;
    scope: 'global' | 'range';
  }
  
  export interface AssignRoleRequest {
    roleId: number;
    rangeId: number | null;
  }
  