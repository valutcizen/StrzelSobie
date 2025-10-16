import { User } from '../users/model';
import { SessionData } from './model';

export interface LoginUserDto {
  email: string;
  password: string;
}

export interface RegisterUserRequestDto {
  email: string;
  password: string;
}

export interface RegisteredUserDto {
  id: User['id'];
  email: User['email'];
}

export interface MeDto {
  id: User['id'];
  email: User['email'];
  phoneNumber: User['phone_number'];
  roles: SessionData['roles'];
  rangeRoles: SessionData['rangeRoles'];
}

