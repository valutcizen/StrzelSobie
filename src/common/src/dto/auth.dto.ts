export class LoginUserDto {
  email!: string;
  password!: string;
}

export class RegisterUserRequestDto {
  email!: string;
  password!: string;
}

export class RegisteredUserDto {
  id!: number;
  email!: string;
  roles!: string[];
}

export interface MeDto {
  id: number;
  email: string;
  phoneNumber: string | null;
  roles: string[];
  rangeRoles: Record<string, string[]>;
}
