export class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export class RoleNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoleNotFoundError';
  }
}

export class RoleScopeError extends Error {
  constructor(message: string) {
        super(message);
        this.name = 'RoleScopeError';
      }
    }
    
    export class RangeNotFoundError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'RangeNotFoundError';
      }
    }
    
    export class ForbiddenError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ForbiddenError';
      }
    }
    
