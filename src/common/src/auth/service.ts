import { Result } from "../result";
import { LoginUserDto, RegisteredUserDto, RegisterUserRequestDto } from "./dto";
import { SessionData } from "./model";

export interface IAuthService {
  login(dto: LoginUserDto): Promise<Result<{ token: string, session: SessionData }>>;
  validateSession(token: string): Promise<Result<SessionData>>;
  register(dto: RegisterUserRequestDto, sourceIp: string, proxiedIp: string): Promise<Result<RegisteredUserDto>>;
  logout(sessionToken: string): Promise<Result<void>>;
}
