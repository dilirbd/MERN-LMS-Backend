import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { Error } from "mongoose";
import ms from "ms";
import { config } from "../config/envConfig.ts";
import SessionModel from "../model/session.model.ts";
import UserModel from "../model/user.model.ts";
import type { User } from "../model/user.model.ts";
import { apiResponse } from "../utils/apiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { AppError } from "../utils/globalErrorHandler.ts";
import { hashSessionToken } from "../utils/obfuscationHelper.ts";
import { sendReset, sendVerificationLink } from "../utils/sendEmail.ts";
import { generateSessionToken, getSessionExpiration } from "../utils/sessionHelper.ts";
import { countries, countryDialCodes } from "../utils/validation/auth.validation.ts";
import { emailSanitizer, passwordChecker } from "../utils/validationHelper.ts";

interface RegData {
	fields: Record<string, string>;
}

const registrationHandler = asyncHandler(async (req: Request, res: Response) => {
	const name = String(req.body.name.trim());
	const email = String(req.body.email.trim());
	const password = String(req.body.password.trim());
	const countryCode = (req.body.countryCode) ? String(req.body.countryCode.trim()) : req.body.countryCode;
	const phone = (req.body.phone) ? String(req.body.phone.trim()) : req.body.phone;
	const address = (req.body.address) ? String(req.body.address.trim()) : req.body.address;
	const city = (req.body.city) ? String(req.body.city.trim()) : req.body.city;
	const country = (req.body.country) ? String(req.body.country.trim()) : req.body.country;
	const role = (req.body.role) ? String(req.body.role.trim()) : req.body.role;

	if (!passwordChecker(password).valid) {
		apiResponse(res, 400, "Invalid password!");
		return;
	}

	if (bcrypt.truncates(password)) {
		throw new AppError<RegData>("Bad password!", 400, {
			fields: {
				password: "Password is too expensive!",
			},
		});
	}

	const salt = await bcrypt.genSalt(13);
	const hash = await bcrypt.hash(password, salt);

	const cleanedEmail = emailSanitizer(req.body.email.trim());

	const userObj: User = {
		name: name,
		password: hash,
		email: email,
		cleanedEmail,
		...(req.body.phone && { phone: phone }),
		...(req.body.countryCode && { countryCode: countryCode }),
		...(req.body.address && { address: address }),
		...(req.body.city && { city: city }),
		...(req.body.country && { country: country }),
		...(req.body.role && { role: role }),
	};

	const user = new UserModel(userObj);

	const existingUser = await UserModel.findOne({ cleanedEmail: cleanedEmail }).select("+cleanedEmail +password"); // check if sanitized email already exists to prevent "salted" emails

	if (existingUser) {
		if (!(existingUser.verified)) {
			const hasChanges = Object.keys(user).some((key) => existingUser.get(key) !== user.get(key));
			// the email address of the user already exists but isn't verified and the user is trying to register with the exact same information again
			if (!hasChanges) {
				const emailResult = await sendVerificationLink(req, existingUser._id.toString());
				if (!(emailResult instanceof Error)) {
					apiResponse(
						res,
						201,
						`A verification mail containing your account activation link has been resent to your email address! Please check your inbox and click on the verification link to activate your account. \nDidn't receive it? Check your spam folder or verify that the address you entered - (${email}), is correct.`,
						{ updatedUser: user, mailResult: emailResult },
					);
					return;
				}
				else throw emailResult;
			}
			// the email address of the user already exists but isn't verified and the user is trying to register again but with different other information
			else {
				apiResponse(res, 400, `Invalid information provided!`);
				return;
			}
		}
		// user already exists and is verified
		else {
			apiResponse(res, 400, `Invalid information provided!`);
			return;
		}
	}
	else {
		const updatedUser = await user.save();
		const emailResult = await sendVerificationLink(req, updatedUser._id.toString());
		if (emailResult instanceof Error) {
			// if sending verification mail failed, undo the user.save() before throwing an error
			await UserModel.findByIdAndDelete(updatedUser._id);
			throw emailResult;
		}
		else {
			apiResponse(
				res,
				201,
				`User registration successful! A verification mail containing your account activation link has been sent to your email address! Please check your inbox and click on the verification link to activate your account. \nDidn't receive it? Check your spam folder or verify that the address you entered - (${email}), is correct.`,
				{ updatedUser: user, mailResult: emailResult },
			);
			return;
		}
	}
});

const loginHandler = asyncHandler(async (req: Request, res: Response) => {
	const email = String(req.body.email.trim());
	const password = String(req.body.password.trim());
	const cleanEmail = emailSanitizer(email);

	const user = await UserModel.findOne({ cleanedEmail: cleanEmail }).select(
		"+password +resetToken +resetTokenStatus",
	);

	if (user && user.verified && user.isActive) {
		const storedPass = user.password;
		if (bcrypt.truncates(password)) {
			throw new AppError<RegData>("Bad password!", 400, {
				fields: {
					password: "Password is too expensive!",
				},
			});
		}
		const passMatch = await bcrypt.compare(password, storedPass.toString());

		if (passMatch) {
			const token = generateSessionToken();

			res.cookie("sessionToken", token, {
				httpOnly: true,
				secure: config.nodeEnv === "prod",
				sameSite: (config.nodeEnv === "prod") ? "none" : "lax",
				maxAge: ms(config.sExpiry),
				path: "/",
			});

			console.log(
				"SET-COOKIE HEADER:",
				res.getHeader("Set-Cookie"),
			);

			const prevSession = await SessionModel.findOne({ user: user._id });

			if (prevSession) {
				await SessionModel.deleteOne({ _id: prevSession._id });
			}

			const session = await SessionModel.create({
				user: user._id,
				token: hashSessionToken(token),
				expiresAt: getSessionExpiration(),
			});

			const userToSend = {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			};

			if (user.resetToken && user.resetTokenStatus) {
				await UserModel.findOneAndUpdate(
					{ _id: user._id },
					{
						resetToken: null,
						resetTokenStatus: null,
					},
					{ runValidators: true, returnDocument: "after" },
				);
			}
			apiResponse(res, 200, `Welcome, ${user.name}!`, userToSend);
			return;
		}
	}
	apiResponse(res, 401, "This user does not exist!");
});

const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
	const sessionToken = req.cookies?.sessionToken;

	if (sessionToken) {
		const tokenHash = hashSessionToken(sessionToken);
		const session = await SessionModel.findOneAndDelete({
			token: tokenHash,
		});

		if (!session) {
			apiResponse(res, 400, "Invalid request!");
			return;
		}
	}

	res.clearCookie("sessionToken", {
		httpOnly: true,
		secure: config.nodeEnv === "prod",
		sameSite: (config.nodeEnv === "prod") ? "none" : "lax",
		path: "/",
	});

	apiResponse(res, 200, "Logged out.");
});

const fpHandler = asyncHandler(async (req: Request, res: Response) => {
	type ValidQueryData = {
		mailLink: string;
		mailOtp: string;
		smsOtp: string;
	};
	const queryNames: readonly (keyof ValidQueryData)[] = [
		"mailLink",
		"mailOtp",
		"smsOtp",
	];

	function isValidQueryObject(data: object): data is ValidQueryData {
		return Object.entries(data).every(([key, value]) => {
			if (!(queryNames.includes(key as typeof queryNames[number]))) return false;

			switch (key) {
				case "mailLink":
					return value === "true" || value === "false";
				case "mailOtp":
					return value === "true" || value === "false";
				case "smsOtp":
					return value === "true" || value === "false";
				default:
					return false;
			}
		});
	}

	// the email address has to be sent to the server through the req body
	const email = String(req.body.email.trim());
	const cleanEmail = emailSanitizer(email);

	// query keys should only be mailLink, mailOtp or smsOtp and should contain boolean values
	const queryLength = Object.keys(req.query).length; // length shouldn't be more than one
	const hasQuery = queryLength ? true : false;
	if (queryLength > 1 || !isValidQueryObject(req.query)) {
		apiResponse(res, 400, "Invalid request!");
		return;
	}

	const user = await UserModel.findOne({ cleanedEmail: cleanEmail });

	if (!(user && user.verified)) {
		apiResponse(res, 401, "This user does not exist!");
		return;
	}

	if (hasQuery) {
		if (req.query.mailOtp === "true") {
			const emailResult = await sendReset(req, { id: user._id.toString("hex"), mode: "otp" });
			if (!(emailResult instanceof Error)) {
				const dbResult = await UserModel.findOneAndUpdate(
					{ _id: user._id, __v: user.__v },
					{
						resetToken: emailResult.hashToStore,
						resetTokenStatus: "pending",
						$inc: { __v: 1 },
					},
					{ runValidators: true },
				);
				if (dbResult) {
					apiResponse(res, 200, "A mail containing the OTP has been sent!");
				}
				else {
					apiResponse(res, 400, "Failed to complete the request!");
				}
			}
			else throw emailResult;
		}
		else if (req.query.mailLink === "true") {
			const emailResult = await sendReset(req, { id: user._id.toString("hex"), mode: "link" });
			if (!(emailResult instanceof Error)) {
				const dbResult = await UserModel.findOneAndUpdate(
					{ _id: user._id, __v: user.__v },
					{
						resetToken: emailResult.hashToStore,
						resetTokenStatus: "pending",
						$inc: { __v: 1 },
					},
					{ runValidators: true },
				);
				if (dbResult) {
					apiResponse(res, 200, "A mail containing the reset link has been sent!");
				}
				else {
					apiResponse(res, 400, "Failed to complete the request!");
				}
			}
			else throw emailResult;
		}
		// req.query.smsOtp - not implemented. Requires sending the phone number to sendReset().
		else {
			if (!(user.phone)) {
				apiResponse(res, 400, "Invalid request!");
				return;
			}
			apiResponse(res, 500, "Not implemented!");
		}
	}
	else {
		const userOptions = {
			mailLink: true,
			mailOtp: true,
			// ...(user.phone && { smsOtp: true }),
		};
		apiResponse(res, 201, "Choose an option to reset your password", userOptions);
	}
});

const meHandler = asyncHandler(async (req: Request, res: Response) => {
	const userToSend = {
		...(req.user && { _id: req.user.id }),
		...(req.user && { name: req.user.name }),
		...(req.user && { email: req.user.email }),
		...(req.user && { role: req.user.role }),
		...(req.user && req.user.phone && { countryCode: req.user.countryCode }),
		...(req.user && req.user.phone && { phone: req.user.phone }),
		...(req.user && req.user.address && { address: req.user.address }),
		...(req.user && req.user.city && { city: req.user.city }),
		...(req.user && req.user.country && { country: req.user.country }),
	};
	apiResponse(res, 200, `Currently logged in.`, userToSend);
});

const updateProfileHandler = asyncHandler(async (req: Request, res: Response) => {
	const name = String(req.body.name.trim());
	const countryCode = (req.body.countryCode) ? String(req.body.countryCode.trim()) : req.body.countryCode;
	const phone = (req.body.phone) ? String(req.body.phone.trim()) : req.body.phone;
	const address = (req.body.address) ? String(req.body.address.trim()) : req.body.address;
	const city = (req.body.city) ? String(req.body.city.trim()) : req.body.city;
	const country = (req.body.country) ? String(req.body.country.trim()) : req.body.country;

	const userBefore = await UserModel.findById(req.user!.id).select(
		"+countryCode +phone +address +city +country",
	);

	if (!userBefore) {
		apiResponse(res, 404, "User doesn't exist.");
		return;
	}

	const userObj = {
		...(name && { name: name }),
		...(phone && { phone: phone }),
		...(countryCode && { countryCode: countryCode }),
		...(address && { address: address }),
		...(city && { city: city }),
		...(country && { country: country }),
		...(!countryCode && !phone && phone !== userBefore.phone && { countryCode: "+880" }),
		...(!phone && phone !== userBefore.phone && { phone: undefined }),
		...(!address && address !== userBefore.address && { address: undefined }),
		...(!city && city !== userBefore.city && { city: undefined }),
		...(!country && country !== userBefore.country && { country: undefined }),
	};

	userBefore.set(userObj);

	const userAfter = await userBefore.save();

	if (userAfter) {
		const userToSend = {
			...(userAfter && { id: userAfter.id }),
			...(userAfter && { name: userAfter.name }),
			...(userAfter && { email: userAfter.email }),
			...(userAfter && { role: userAfter.role }),
			...(userAfter && userAfter.phone && { countryCode: userAfter.countryCode }),
			...(userAfter && userAfter.phone && { phone: userAfter.phone }),
			...(userAfter && userAfter.address && { address: userAfter.address }),
			...(userAfter && userAfter.city && { city: userAfter.city }),
			...(userAfter && userAfter.country && { country: userAfter.country }),
		};
		apiResponse(res, 200, "Profile updated successfully.", userToSend);
	}
	else {
		apiResponse(res, 400, "Failed to update profile.");
	}
	return;
});

const regionHandler = asyncHandler(async (req: Request, res: Response) => {
	apiResponse(res, 200, "Valid country list and country dial codes", {
		countries: countries,
		dialCodes: countryDialCodes,
	});
	return;
});

export const regHandler = registrationHandler;
export { fpHandler, loginHandler, logoutHandler, meHandler, regionHandler, updateProfileHandler };
