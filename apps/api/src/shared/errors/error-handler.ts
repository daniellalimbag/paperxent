import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '../http/api-response.js';
import { logger } from '../logging/logger.js';
import { AppError } from './app-error.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    const response: ApiErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: error.flatten(),
      },
    };

    res.status(400).json(response);
    return;
  }

  if (error instanceof AppError) {
    const response: ApiErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };

    res.status(error.statusCode).json(response);
    return;
  }

  logger.error('Unhandled application error', { error });

  const response: ApiErrorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  };

  res.status(500).json(response);
};
