import type { NextFunction, Request, Response } from "express";
import { Error, mongo } from "mongoose";
import { config } from "../config/envConfig.ts";
import { apiResponse } from "./apiResponse.ts";

class AppError<T = undefined> extends Error {
	statusCode: number;
	payload?: T;

	constructor(message: string, statusCode = 500, payload?: T) {
		super(message);
		this.statusCode = statusCode;
		this.payload = payload;
		// e.g., this causes a MongooseError error to be called AppError instead of MongooseError
		Object.defineProperty(this, "name", {
			value: (this.constructor.name === "AppError") ? this.name : this.constructor.name,
			writable: true,
			configurable: true,
		});
		// attach the stack to this error object (which happens automatically anyway) but exclude it's constructor from the stack trace
		Error.captureStackTrace(this, this.constructor);
	}
}

class EmailSanitizeError<T = undefined> extends AppError<T> {
	constructor(message = "Bad email address", payload?: T) {
		super(message, 400, payload);
	}
}

// use the following to throw an AppError with payload (example):
// interface ValidationData {
//     fields: Record<string, string>;
//     ............
// }
//
// throw new AppError<ValidationData>("Validation failed!", 401, {
//     fields: { email: 'Email already exists!' },
//     ............
// });

interface BasicErrorPayloadType {
	fields: Record<string, string>;
}

function getErrorResponse<T>(err: AppError<T>): { statusCode: number; message: string; data?: T; stack?: string; } {
	const response: ReturnType<typeof getErrorResponse<T>> = {
		statusCode: err.statusCode,
		message: err.message,
	};

	if (err.payload !== undefined) {
		response.data = err.payload;
	}

	if (config.nodeEnv === "dev") {
		response.stack = err.stack;
	}

	return response;
}

const globalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
	const isDev = config.nodeEnv === "dev";
	let statusCode = 500;

	if (err instanceof AppError) {
		const response = getErrorResponse(err);
		return apiResponse(res, ...[
			response.statusCode,
			response.message,
			response.data,
			response.stack,
		]);
	}

	if (err instanceof Error.ValidationError) {
		statusCode = 400;
		for (const key of Object.keys(err.errors)) {
			delete (err.errors[key] as any).properties; // private property but appears at runtime, so ts doesn't recognize
		}
		return apiResponse(
			res,
			statusCode,
			`GEH_(${statusCode}): ${err.name} : ` + (err as any)._message, // private property but appears at runtime, so ts doesn't recognize
			err,
			isDev ? err.stack?.replace(/^.*\n/, "").trimStart() : undefined,
		);
	}

	if (err instanceof Error.CastError) {
		statusCode = 400;
		return apiResponse(
			res,
			statusCode,
			`GEH_(${statusCode}): ${err.name} : ` + err.message,
			err ? err : undefined,
			isDev ? err.stack?.replace(/^.*\n/, "").trimStart() : undefined, // doing the same thing as below but with regex (removing the first line till \n)
		);
	}

	if (err instanceof mongo.MongoServerError) {
		statusCode = 409;
		return apiResponse(
			res,
			statusCode,
			`GEH_(${statusCode}): ${err.name} : E11000 duplicate key error`,
			err.errorResponse.errmsg,
			isDev ? err.stack?.split("\n").slice(1).join("\n").trimStart() : undefined, // removing err.name and err.message from the stack
		);
	}

	console.log(err);

	apiResponse(
		res,
		statusCode,
		`GEH_(${statusCode}): ${err.name} : ` + (err.message || "Somemthing went wrong"),
		undefined,
		isDev ? err.stack : undefined,
	);
};

export default globalErrorHandler;
export { AppError, EmailSanitizeError };
export type { BasicErrorPayloadType };
