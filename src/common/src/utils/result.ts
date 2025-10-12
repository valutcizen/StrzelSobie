export class Result<T, E extends Error> {
  private constructor(
    public readonly isSuccess: boolean,
    private readonly value: T | undefined,
    private readonly error: E | undefined = undefined
  ) {}

  public static ok<T, E extends Error>(value: T): Result<T, E> {
    return new Result(true, value);
  }

  public static fail<T, E extends Error>(error: E): Result<T, E> {
    return new Result(false, undefined as T, error);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error("Cannot get the value of a failed result.");
    }
    return this.value!;
  }

  public getError(): E {
    if (this.isSuccess) {
      throw new Error("Cannot get the error of a successful result.");
    }
    return this.error!;
  }
}
