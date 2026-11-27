import type { Request, Response } from 'express';
import { AuthService, type RequestAuditContext } from '../services/authService.ts';
import { getUser } from '../middlewares/auth.ts';
import { getValidated } from '../middlewares/validate.ts';
import type { LoginInput, RegisterInput } from '../schemas/authSchema.ts';

function extractAuditContext(req: Request): RequestAuditContext {
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp =
    typeof forwarded === 'string' && forwarded.trim().length > 0
      ? forwarded.split(',')[0]!.trim()
      : req.ip || req.socket.remoteAddress || 'unknown';
  const ipAddress = rawIp.replace(/^::ffff:/i, '');
  const userAgent = req.get('user-agent') || 'unknown';
  return { ipAddress, userAgent };
}

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService = new AuthService()) {
    this.authService = authService;
  }

  register = async (_req: Request, res: Response): Promise<void> => {
    const body = getValidated<RegisterInput>(res, 'body');
    const user = await this.authService.register(body);
    res.status(201).json({ status: 'success', data: { user } });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const body = getValidated<LoginInput>(res, 'body');
    const data = await this.authService.login(body, extractAuditContext(req));
    res.status(200).json({ status: 'success', data });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const user = getUser(req);
    const context = extractAuditContext(req);
    await this.authService.logout(user, context);
    res.status(200).json({
      status: 'success',
      message: 'Logout berhasil',
      data: { ipAddress: context.ipAddress },
    });
  };

  getMe = async (req: Request, res: Response): Promise<void> => {
    const user = getUser(req);
    res.status(200).json({ status: 'success', data: user });
  };
}
