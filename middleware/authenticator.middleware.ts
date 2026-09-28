import type { NextFunction, Request, Response } from "express";
import { config } from "../config/envConfig.ts";
import { SessionModel } from "../model/session.model.ts";
import { UserModel } from "../model/user.model.ts";
import { apiResponse } from "../utils/apiResponse.ts";
import { hashSessionToken } from "../utils/obfuscationHelper.ts";

export async function authenticate(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const sessionToken = (req.cookies?.sessionToken)
			? String(req.cookies?.sessionToken)
			: req.cookies?.sessionToken;

		if (!sessionToken) {
			apiResponse(res, 401, "Authentication required.");
			return;
		}

		const tokenHash = hashSessionToken(sessionToken);

		const session = await SessionModel.findOne({
			token: tokenHash,
			expiresAt: { $gt: new Date() },
		});

		if (!session) {
			res.clearCookie("sessionToken", {
				httpOnly: true,
				secure: config.nodeEnv === "prod",
				sameSite: (config.nodeEnv === "prod") ? "none" : "lax",
				path: "/",
			});
			apiResponse(res, 401, "Invalid or expired session. Login again.");
			return;
		}

		const user = await UserModel.findById(session.user).select(
			"-__v +countryCode +phone +address +city +country",
		);

		if (!(user && user.isActive && user.verified)) {
			await SessionModel.deleteOne({ _id: session._id });

			apiResponse(res, 401, "Invalid user.");
			return;
		}

		req.user = user;
		req.sessionId = session.id;

		next();
	}
	catch (error) {
		next(error);
	}
}

export async function optionalAuthenticate(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const sessionToken = (req.cookies?.sessionToken)
			? String(req.cookies?.sessionToken)
			: req.cookies?.sessionToken;

		if (!sessionToken) {
			return next();
		}

		const tokenHash = hashSessionToken(sessionToken);

		const session = await SessionModel.findOne({
			token: tokenHash,
			expiresAt: { $gt: new Date() },
		});

		if (!session) {
			res.clearCookie("sessionToken", {
				httpOnly: true,
				secure: config.nodeEnv === "prod",
				sameSite: (config.nodeEnv === "prod") ? "none" : "lax",
				path: "/",
			});
			return next();
		}

		const user = await UserModel.findById(session.user).select(
			"-__v +countryCode +phone +address +city +country",
		);

		if (!(user && user.isActive && user.verified)) {
			await SessionModel.deleteOne({ _id: session._id });

			return next();
		}

		req.user = user;
		req.sessionId = session.id;

		next();
	}
	catch (error) {
		next(error);
	}
}
