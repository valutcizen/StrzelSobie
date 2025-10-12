export interface Role {
  readonly id: number;
  readonly name: string;
  readonly scope: 'global' | 'range';
}
