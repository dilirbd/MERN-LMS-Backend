import express, { Router } from "express";
import {
	fpHandler,
	loginHandler,
	logoutHandler,
	meHandler,
	regHandler,
	regionHandler,
	updateProfileHandler,
} from "../../controller/auth.controller.ts";
import {
	linkVerificationHandler,
	otpVerificationHandler,
	resetPasswordHandler,
} from "../../controller/passreset.controller.ts";
import emailVerificationHandler from "../../controller/verification.controller.ts";
import { authenticate } from "../../middleware/authenticator.middleware.ts";
import {
	dcRateLimit,
	loginRateLimit,
	regRateLimit,
	userVerifyRateLimit,
} from "../../middleware/rateLimiter.middleware.ts";
import { validate } from "../../middleware/validator.middleware.ts";
import {
	loginSchema,
	otpSchema,
	registrationSchema,
	resetPassSchema,
	updateProfileSchema,
} from "../../utils/validation/auth.validation.ts";

const router: Router = express.Router();

// root/api/v1/auth

// verify email address used for registration
router.get("/register/verify/:id", dcRateLimit, userVerifyRateLimit, emailVerificationHandler);
// register
router.post("/register", dcRateLimit, validate(registrationSchema), regRateLimit, regHandler);

// for fp reset with link
router.get("/login/fp/reset/:id", dcRateLimit, userVerifyRateLimit, linkVerificationHandler);
// for fp reset with otp - requires email address and otp in the body
router.post(
	"/login/fp/reset/otp-verify",
	dcRateLimit,
	validate(otpSchema),
	userVerifyRateLimit,
	otpVerificationHandler,
);

// for fp - new password set - must contain only reset token, new and re-entered new password in the body.
// if otp verification was used, must contain `method: "otp"` in the body too.
router.post(
	"/login/fp/reset/setup/:id",
	dcRateLimit,
	validate(resetPassSchema),
	userVerifyRateLimit,
	resetPasswordHandler,
);

// login
router.post("/login", dcRateLimit, validate(loginSchema), loginRateLimit, loginHandler);

router.post("/logout", logoutHandler);

// forgot password - hit this route with the email in body and without any query params to get a list of valid query params (smsOtp won't work)
router.post("/login/fp", dcRateLimit, fpHandler);

// get currently logged in user's info
router.get("/profile", authenticate, meHandler);
router.patch("/profile/update", dcRateLimit, authenticate, validate(updateProfileSchema), updateProfileHandler);
router.get("/get-regions", regionHandler);

export default router;
