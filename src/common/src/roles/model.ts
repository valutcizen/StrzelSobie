export interface Role {
  id: number;
  name: string;
  scope: 'global' | 'range';
}