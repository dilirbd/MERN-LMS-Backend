import type { NextFunction, Request, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { RateLimitInfo } from "express-rate-limit";
import { apiResponse } from "../utils/apiResponse.ts";
import { emailSanitizer } from "../utils/validationHelper.ts";

// double click rate limit
const dcRateLimit = rateLimit({
	windowMs: 1 * 1000, // 1 sec
	limit: 1,
	keyGenerator: (req, res) => {
		const { id } = req.params;
		const token = (Array.isArray(id)) ? id[0] : id;

		const xForwardedFor = req.headers["x-forwarded-for"];
		let dumbTS; // stupid ts bug regarding undefined
		if (xForwardedFor && Array.isArray(xForwardedFor)) {
			dumbTS = xForwardedFor[0].split(",")[0].trim();
		}
		else if (xForwardedFor) {
			dumbTS = xForwardedFor.split(",")[0].trim();
		}
		const ip = req.ip || req.socket.remoteAddress || dumbTS;

		if (ip) {
			return ipKeyGenerator(ip, 56);
		}
		else return "no-ip";
	},
	standardHeaders: "draft-8",
	legacyHeaders: false,
	handler: (req, res, next, options) => {
		apiResponse(res, 429, "Too many attempts! Please try again later.", {
			// dd/mm/yyyy, HH:MM:SS
			retryAfter: new Intl.DateTimeFormat("en-GB", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				hour12: false,
				hourCycle: "h23",
				timeZone: "UTC",
			}).format(new Date((req as Request & { rateLimit: RateLimitInfo; }).rateLimit.resetTime!)),
		});
	},
});

const regRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	limit: 7,
	keyGenerator: (req, res) => {
		const xForwardedFor = req.headers["x-forwarded-for"];
		let dumbTS; // stupid ts bug regarding undefined
		if (xForwardedFor && Array.isArray(xForwardedFor)) {
			dumbTS = xForwardedFor[0].split(",")[0].trim();
		}
		else if (xForwardedFor) {
			dumbTS = xForwardedFor.split(",")[0].trim();
		}
		const ip = req.ip || req.socket.remoteAddress || dumbTS;
		if (ip && ipKeyGenerator(ip, 56)) {
			return emailSanitizer(req.body.email);
		}
		else return "no-email-ip"; // shoudn't reach this
	},
	standardHeaders: "draft-8",
	legacyHeaders: false,
	handler: (req, res, next, options) => {
		apiResponse(res, 429, "Too many attempts! Please try again later.", {
			// dd/mm/yyyy, HH:MM:SS
			retryAfter: new Intl.DateTimeFormat("en-GB", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				hour12: false,
				hourCycle: "h23",
				timeZone: "UTC",
			}).format(new Date((req as Request & { rateLimit: RateLimitInfo; }).rateLimit.resetTime!)),
		});
	},
});

const userVerifyRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	limit: 12,
	keyGenerator: (req, res) => {
		const xForwardedFor = req.headers["x-forwarded-for"];
		let dumbTS;
		if (xForwardedFor && Array.isArray(xForwardedFor)) {
			dumbTS = xForwardedFor[0].split(",")[0].trim();
		}
		else if (xForwardedFor) {
			dumbTS = xForwardedFor.split(",")[0].trim();
		}
		const ip = req.ip || req.socket.remoteAddress || dumbTS;
		if (ip) {
			return ipKeyGenerator(ip, 56);
		}
		else return "no-ip";
	},
	standardHeaders: "draft-8",
	legacyHeaders: false,
	handler: (req, res, next, options) => {
		apiResponse(res, 429, "Too many attempts! Please try again later.", {
			// dd/mm/yyyy, HH:MM:SS
			retryAfter: new Intl.DateTimeFormat("en-GB", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				hour12: false,
				hourCycle: "h23",
				timeZone: "UTC",
			}).format(new Date((req as Request & { rateLimit: RateLimitInfo; }).rateLimit.resetTime!)),
		});
	},
});

const loginRateLimit = rateLimit({
	windowMs: 30 * 60 * 1000, // 30 mins
	limit: 10,
	keyGenerator: (req, res) => {
		const xForwardedFor = req.headers["x-forwarded-for"];
		let dumbTS;
		if (xForwardedFor && Array.isArray(xForwardedFor)) {
			dumbTS = xForwardedFor[0].split(",")[0].trim();
		}
		else if (xForwardedFor) {
			dumbTS = xForwardedFor.split(",")[0].trim();
		}
		const ip = req.ip || req.socket.remoteAddress || dumbTS;
		if (ip) {
			return emailSanitizer(req.body.email) || ipKeyGenerator(ip, 56);
		}
		else return "no-email-ip";
	},
	standardHeaders: "draft-8",
	legacyHeaders: false,
	skipSuccessfulRequests: true,
	handler: (req, res, next, options) => {
		apiResponse(res, 429, "Too many attempts! Please try again later.", {
			// dd/mm/yyyy, HH:MM:SS
			retryAfter: new Intl.DateTimeFormat("en-GB", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				hour12: false,
				hourCycle: "h23",
				timeZone: "UTC",
			}).format(new Date((req as Request & { rateLimit: RateLimitInfo; }).rateLimit.resetTime!)),
		});
	},
});

export { dcRateLimit, loginRateLimit, regRateLimit, userVerifyRateLimit };
