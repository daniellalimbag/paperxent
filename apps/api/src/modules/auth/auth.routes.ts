import { Router } from 'express';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { verifyToken } from './auth.middleware.js';
import { formatAuthUser } from './auth-user.dto.js';
import type { RegisterInput, LoginInput, RefreshTokenInput, AuthResponse } from './auth.types.js';

const router = Router();
const authService = new AuthService();
const authRepository = new AuthRepository();

/**
 * GET /api/auth/me
 * Current user (Bearer access token). Used by the web app after httpOnly cookie login.
 */
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const user = await authRepository.findById(req.user!.userId);
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
      });
    }

    res.status(200).json({
      user: formatAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
  try {
    const input: RegisterInput = req.body;

    // Validate input
    if (!input.email || !input.password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // Check if user already exists
    const existingUser = await authRepository.findByEmail(input.email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already exists',
      });
    }

    // Hash password
    const hashedPassword = await authService.hashPassword(input.password);

    // Create user
    const user = await authRepository.create(input, hashedPassword);

    // Generate tokens
    const authPayload = {
      userId: user.id,
      email: user.email,
    };
    const tokens = authService.generateTokenPair(authPayload);

    // Store refresh token in Redis
    await authRepository.storeRefreshToken({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: authService.getRefreshTokenExpiry(),
    });

    const response: AuthResponse = {
      user: formatAuthUser(user),
      tokens,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login a user
 */
router.post('/login', async (req, res, next) => {
  try {
    const input: LoginInput = req.body;

    // Validate input
    if (!input.email || !input.password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // Verify credentials
    const user = await authRepository.verifyCredentials(input);

    // Verify password
    const isValidPassword = await authService.verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // Generate tokens
    const authPayload = {
      userId: user.id,
      email: user.email,
    };
    const tokens = authService.generateTokenPair(authPayload);

    // Store refresh token in Redis
    await authRepository.storeRefreshToken({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: authService.getRefreshTokenExpiry(),
    });

    const response: AuthResponse = {
      user: formatAuthUser(user),
      tokens,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const input: RefreshTokenInput = req.body;

    // Validate input
    if (!input.refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required',
      });
    }

    // Get refresh token data from Redis
    const tokenData = await authRepository.getRefreshToken(input.refreshToken);
    if (!tokenData) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
      });
    }

    // Get user
    const user = await authRepository.findById(tokenData.userId);
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
      });
    }

    // Delete old refresh token (rotation)
    await authRepository.deleteRefreshToken(input.refreshToken);

    // Generate new tokens
    const authPayload = {
      userId: user.id,
      email: user.email,
    };
    const tokens = authService.generateTokenPair(authPayload);

    // Store new refresh token in Redis
    await authRepository.storeRefreshToken({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: authService.getRefreshTokenExpiry(),
    });

    const response: AuthResponse = {
      user: formatAuthUser(user),
      tokens,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout a user (invalidate refresh token)
 */
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authRepository.deleteRefreshToken(refreshToken);
    }

    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
