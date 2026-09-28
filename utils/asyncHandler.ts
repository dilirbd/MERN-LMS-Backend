import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
    return (req, res, next) => {
        try {
            const callbackResult = fn(req, res, next);

            if (callbackResult instanceof Promise) {
                callbackResult.catch((error) => next(error));
            }
        }
        catch (err) {
            next(err);
        }
    };
};