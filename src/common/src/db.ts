export interface IDbStatement {
  bind(...values: any[]): this;
  first<T>(): Promise<T | null>;
  run(): Promise<any>;
  all<T>(): Promise<{ results: T[] }>;
}

export interface IDatabase {
  prepare(query: string): IDbStatement;
}
