import { EmailAlreadyExistsError, InvalidCredentialsError } from "../errors";
import { Result } from "../result";
import { LoginUserDto, RegisteredUserDto, RegisterUserRequestDto } from "./dto";
import { SessionData } from "./model";

export interface IAuthService {
  login(dto: LoginUserDto): Promise<Result<{ token: string, session: SessionData }, InvalidCredentialsError>>;
  validateSession(token: string): Promise<Result<SessionData, Error>>;
  register(dto: RegisterUserRequestDto, sourceIp: string, proxiedIp: string): Promise<Result<RegisteredUserDto, EmailAlreadyExistsError>>;
  logout(sessionToken: string): Promise<Result<void, Error>>;
}
