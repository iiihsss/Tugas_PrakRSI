import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/userRepository.ts';
import { AuditService } from './auditService.ts';
import { signToken, type AuthUser } from './tokenService.ts';
import { AppError } from '../errors/AppError.ts';
import { UnauthorizedError } from '../errors/UnauthorizedError.ts';
import type { LoginInput, RegisterInput } from '../schemas/authSchema.ts';
import type { AuthUserDto, LoginResponseDto } from '../dtos/authDto.ts';

type UserRow = NonNullable<Awaited<ReturnType<UserRepository['findByEmail']>>>;

export interface RequestAuditContext {
  ipAddress: string;
  userAgent: string;
}

function getSaltRounds(): number {
  return Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
}

export class AuthService {
  private userRepository: UserRepository;
  private auditService: AuditService;

  constructor(
    userRepository: UserRepository = new UserRepository(),
    auditService: AuditService = new AuditService(),
  ) {
    this.userRepository = userRepository;
    this.auditService = auditService;
  }

  private toDto(row: UserRow): AuthUserDto {
    return { id: row.id, name: row.name, email: row.email, role: row.role };
  }

  async register(input: RegisterInput): Promise<AuthUserDto> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError(409, 'Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(input.password, getSaltRounds());

    const row = await this.userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role || 'customer',
    });
    if (!row) throw new AppError(500, 'User gagal dibuat');

    return this.toDto(row);
  }

  async login(input: LoginInput, context: RequestAuditContext): Promise<LoginResponseDto> {
    const row = await this.userRepository.findByEmail(input.email);

    if (!row) throw new UnauthorizedError('Email atau password salah');

    const passwordValid = await bcrypt.compare(input.password, row.passwordHash);
    if (!passwordValid) {
      await this.auditService.recordBestEffort({
        userId: row.id,
        action: 'LOGIN',
        targetTable: 'USERS',
        targetId: row.id,
        metadata: {
          role: row.role,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
          result: 'failed',
        },
      });
      throw new UnauthorizedError('Email atau password salah');
    }

    const user: AuthUser = this.toDto(row);

    await this.auditService.recordBestEffort({
      userId: user.id,
      action: 'LOGIN',
      targetTable: 'USERS',
      targetId: user.id,
      metadata: {
        role: user.role,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        result: 'success',
      },
    });

    return {
      token: signToken(user),
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '2h',
      user,
    };
  }

  async logout(user: AuthUser, context: RequestAuditContext): Promise<void> {
    await this.auditService.recordBestEffort({
      userId: user.id,
      action: 'LOGOUT',
      targetTable: 'USERS',
      targetId: user.id,
      metadata: {
        role: user.role,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        result: 'success',
      },
    });
  }
}
