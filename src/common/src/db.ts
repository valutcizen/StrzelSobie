export interface IDbStatement {
  bind(...values: unknown[]): this;
  first<T>(): Promise<T | null>;
  run(): Promise<void>;
  all<T>(): Promise<{ results: T[] }>;
}

export interface IDatabase {
  prepare(query: string): IDbStatement;
}
