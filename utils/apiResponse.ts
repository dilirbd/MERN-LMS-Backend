import type { Response } from "express";

// type responseType<T = string> = {
interface responseType<T = string> {
    success: boolean;
    message: string;
    data?: T;
    stack?: string;
}

export const apiResponse = <T>(res: Response, statusCode: number, statusMessage: string, bodyData?: T, stackTrace?: string) => {
    const responseBody: responseType<T> = {
        success: (statusCode > 399) ? false : true,
        message: statusMessage,
    };

    if (bodyData !== undefined) {
        responseBody.data = bodyData;
    }

    if (stackTrace !== undefined) {
        responseBody.stack = stackTrace;
    }

    return res.status(statusCode).json(responseBody);
};