import { NextFunction, Request, Response } from "express";
import { UserRole } from "../model/user.model.ts";
import { apiResponse } from "../utils/apiResponse.ts";

export const authorize = (...allowedRoles: UserRole[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!req.user) {
			apiResponse(res, 401, "You are not logged in.");
			return;
		}

		if (!allowedRoles.includes(req.user.role)) {
			apiResponse(res, 403, "Insufficient permissions!");
			return;
		}

		next();
	};
};
