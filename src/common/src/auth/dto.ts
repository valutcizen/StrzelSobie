export interface LoginUserDto {
  email: string;
  password: string;
}

export interface RegisterUserRequestDto {
  email: string;
  password: string;
}

export interface RegisteredUserDto {
  id: number;
  email: string;
}

export interface MeDto {
  id: number;
  email: string;
  phoneNumber: string | null;
  roles: string[];
  rangeRoles: Record<string, string[]>;
}
