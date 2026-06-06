import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { validateRequest } from '../../shared/http/validate-request.js';
import { UsersService } from './users.service.js';

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    passwordHash: z.string().min(1),
  }),
});

const usersService = new UsersService();

export const usersRouter = Router();

usersRouter.post(
  '/',
  validateRequest(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await usersService.createUser(req.body);
    res.status(201).json({ data: user });
  }),
);
