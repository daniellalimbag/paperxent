import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { JwtPayload, AuthPayload } from './auth.types.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const authService = new AuthService();
const authRepository = new AuthRepository();

/**
 * Middleware to verify JWT token and inject user into request
 */
export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: 'Access token is required',
        statusCode: 401,
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = authService.verifyAccessToken(token);

    // Verify user still exists
    const user = await authRepository.findById(payload.userId);
    if (!user) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: 'User not found',
        statusCode: 401,
      });
    }

    // Inject user into request
    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const payload = authService.verifyAccessToken(token);

    const user = await authRepository.findById(payload.userId);
    if (user) {
      req.user = {
        userId: payload.userId,
        email: payload.email,
      };
    }

    next();
  } catch (error) {
    // Don't fail on optional auth, just continue without user
    next();
  }
}
