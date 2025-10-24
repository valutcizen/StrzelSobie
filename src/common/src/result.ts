export class Result<T> {
  private constructor(
    public readonly isSuccess: boolean,
    private readonly value: T | undefined = undefined,
    private readonly error: Error | undefined = undefined
  ) {}

  public static ok<T>(value: T): Result<T> {
    return new Result(true, value);
  }

  public static fail<T>(error: Error): Result<T> {
    return new Result(false, undefined as T, error);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error("Cannot get the value of a failed result.");
    }
    return this.value!;
  }

  public getError(): Error {
    if (this.isSuccess) {
      throw new Error("Cannot get the error of a successful result.");
    }
    return this.error!;
  }
}
