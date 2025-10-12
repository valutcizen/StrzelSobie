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
