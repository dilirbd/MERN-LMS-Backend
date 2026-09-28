import type { NextFunction, Request, Response } from "express";
import * as z from "zod";
import { apiResponse } from "../utils/apiResponse.ts";

export const validate = (schema: z.ZodType) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.body);

		if (!result.success) {
			const errors = result.error.issues.map((issue) => ({
				field: issue.path.join("."),
				message: issue.message,
			}));

			apiResponse(res, 400, "Invalid input!", errors);
			return;
		}

		req.body = result.data;
		next();
	};
};

export const validateQuery = (schema: z.ZodType) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.query ?? {});
		// console.log(req.query);
		// console.log(req.url);

		if (!result.success) {
			const errors = result.error.issues.map((issue) => ({
				field: issue.path.join("."),
				message: issue.message,
			}));
			apiResponse(res, 400, "Invalid query parameters.", errors);
			return;
		}

		const processedQuery = result.data as typeof req.query;

		Object.defineProperty(req, "query", {
			value: processedQuery,
			writable: true,
			configurable: true,
			enumerable: true,
		});

		next();
	};
};
