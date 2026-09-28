import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import UserModel from "../model/user.model.ts";
import { apiResponse } from "../utils/apiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { AppError } from "../utils/globalErrorHandler.ts";
import type { BasicErrorPayloadType } from "../utils/globalErrorHandler.ts";
import { verifyTokenPass } from "../utils/obfuscationHelper.ts";
import { emailSanitizer, passwordChecker } from "../utils/validationHelper.ts";

// directly fetches the actual token stored in db from the decrypted id and returns it
const otpVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
	const receivedEmail = (typeof req.body.email === "string") ? (req.body.email as string).trim() : "";
	const receivedOtp = (typeof req.body.otp === "string") ? (req.body.otp as string).trim() : "";
	const cleanEmail = emailSanitizer(receivedEmail);

	// post request for otp verification, for otp-based reset, requires email and otp in the body
	if (cleanEmail) {
		// user has entered an otp on the otp entry page
		if (receivedOtp) {
			if (receivedOtp.length !== 8) {
				apiResponse(res, 400, "Invalid request!");
				return;
			}
			const user = await UserModel.findOne({
				cleanedEmail: cleanEmail,
				resetTokenStatus: "pending",
			}).select("+resetToken");

			if (!(user && user.resetToken)) {
				apiResponse(res, 400, "Invalid request!");
				return;
			}
			const verifyResults = verifyTokenPass({
				id: user._id.toString("hex"),
				tokenHash: user.resetToken.toString(),
				otp: receivedOtp,
			});
			if (!verifyResults.match) {
				apiResponse(res, 400, "Invalid request!");
				return;
			}
			const result = await UserModel.findOneAndUpdate(
				{ _id: user._id, __v: user.__v, resetTokenStatus: "pending" },
				{
					resetTokenStatus: "updating",
					$inc: { __v: 1 },
				},
				{ runValidators: true, returnDocument: "after" },
			);
			if (result) {
				apiResponse(res, 200, "Set your new password.", { token: user.resetToken.toString() });
				return;
			}
			else {
				apiResponse(res, 400, "Operation failed!");
				return;
			}
		}
		else {
			apiResponse(res, 400, "Invalid request!");
			return;
		}
	}
	else {
		apiResponse(res, 400, "Invalid request!");
		return;
	}
});

// rebuilds the supposed token stored in db and returns it
const linkVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
	const { id: token } = req.params as Record<string, string>;
	const verifyResults = verifyTokenPass({ token });
	if (!verifyResults.match) {
		apiResponse(res, 400, "Invalid request!");
		return;
	}
	else {
		apiResponse(res, 200, "Set your new password.", { token: verifyResults.derivedHash });
	}
});

const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params as Record<string, string>;
	const receivedToken = id.trim();
	const pass = (typeof req.body.pass === "string") ? (req.body.pass as string).trim() : "";
	const re_pass = (typeof req.body.repass === "string") ? (req.body.repass as string).trim() : "";
	const mode = (typeof req.body.method === "string") ? (req.body.method as string).trim() : "";

	// password must contain at least 1 character from a-z, 1 from A-Z and 1 digit.
	if (!(receivedToken && pass && re_pass) || pass !== re_pass || !passwordChecker(pass).valid) {
		apiResponse(res, 400, "Invalid request!");
		return;
	}

	if (mode === "otp") {
		const user = await UserModel.findOne({ resetToken: receivedToken, resetTokenStatus: "updating" }).select(
			"+password",
		);
		if (!user) {
			apiResponse(res, 400, "Invalid request!");
			return;
		}
		if (bcrypt.truncates(pass)) {
			throw new AppError<BasicErrorPayloadType>("Bad password!", 400, {
				fields: {
					password: "Password is too expensive!",
				},
			});
		}
		// the new password shouldn't be the same as previous
		const comparePass = await bcrypt.compare(pass, user.password.toString());
		if (comparePass) {
			apiResponse(res, 400, "Invalid request!");
			return;
		}
		const salt = await bcrypt.genSalt(13);
		const passHash = await bcrypt.hash(pass, salt);

		const updateResult = await UserModel.findOneAndUpdate(
			{ _id: user._id, __v: user.__v, resetToken: receivedToken, resetTokenStatus: "updating" },
			{
				password: passHash,
				resetToken: null,
				resetTokenStatus: null,
				$inc: { __v: 1 },
			},
			{ runValidators: true, returnDocument: "after" },
		);
		if (updateResult) {
			apiResponse(res, 200, "Update successful!");
			return;
		}
		else {
			apiResponse(res, 400, "Operation failed!");
			return;
		}
	}
	else if (!mode) {
		const user = await UserModel.findOne({ resetToken: receivedToken, resetTokenStatus: "pending" }).select(
			"+password",
		);
		if (!user) {
			apiResponse(res, 400, "Invalid request!");
			return;
		}
		if (bcrypt.truncates(pass)) {
			throw new AppError<BasicErrorPayloadType>("Bad password!", 400, {
				fields: {
					password: "Password is too expensive!",
				},
			});
		}
		// the new password shouldn't be the same as previous
		const comparePass = await bcrypt.compare(pass, user.password.toString());
		if (comparePass) {
			apiResponse(res, 400, "Invalid request!");
			return;
		}
		const salt = await bcrypt.genSalt(13);
		const passHash = await bcrypt.hash(pass, salt);

		const updateResult = await UserModel.findOneAndUpdate(
			{ _id: user._id, __v: user.__v, resetToken: receivedToken, resetTokenStatus: "pending" },
			{
				password: passHash,
				resetToken: null,
				resetTokenStatus: null,
				$inc: { __v: 1 },
			},
			{ runValidators: true, returnDocument: "after" },
		);
		if (updateResult) {
			apiResponse(res, 200, "Update successful!");
			return;
		}
		else {
			apiResponse(res, 400, "Operation failed!");
			return;
		}
	}
	else {
		apiResponse(res, 400, "Invalid request!");
		return;
	}
});

export { linkVerificationHandler, otpVerificationHandler, resetPasswordHandler };
