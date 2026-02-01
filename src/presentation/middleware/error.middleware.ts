import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/utils/errors';
import logger from '../../shared/utils/logger';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof AppError) {
        if (err.isOperational) {
            logger.warn(`Operational Error: ${err.message}`);
        } else {
            logger.error(`Programming Error: ${err.message}`, err);
        }
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
    }

    // Unhandled errors
    logger.error(`Unhandled Error: ${err.message}`, err);
    return res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
    });
};
