import { EmailSanitizeError } from "./globalErrorHandler.ts";
import type { BasicErrorPayloadType } from "./globalErrorHandler.ts";

const emailSanitizer = (email: string) => {
	let [local, domain] = email
		.trim()
		.normalize("NFKC")
		.split(/[@]+(?=(?:[^"]*"[^"]*")*[^"]*$)/)
		.map((val) => val.trim().replace(/\s+/g, ""));

	local = local.toLowerCase().split("+")[0];

	if (!domain) throw getEmailSanitizerError(email, `${local}@${domain}`);
	domain = domain.toLowerCase();
	if (domain === "googlemail.com") domain = "gmail.com";

	if (domain === "gmail.com") {
		local = local.replace(/[\.]+(?=(?:[^"]*"[^"]*")*[^"]*$)/g, "");
	}
	if (!local) throw getEmailSanitizerError(email, `${local}@${domain}`);

	return `${local}@${domain}`;
};

const getEmailSanitizerError = (email: string, cleanEmail: unknown) => {
	return new EmailSanitizeError<BasicErrorPayloadType>("Bad email address!", {
		fields: { givenEmail: email, cleanedEmail: String(cleanEmail) },
	});
};

const passwordChecker = (password: string): { valid: boolean; message?: string; } => {
	const pass = password.trim();
	let msg: string;

	if (!/^[a-zA-Z0-9!@#$%^&*]+$/.test(pass)) {
		msg = "Contains invalid character(s).";
		return { valid: false, message: msg };
	}
	if (!/[a-z]/.test(pass)) {
		msg = "Must contain at least 1 lowercase character.";
		return { valid: false, message: msg };
	}
	if (!/[A-Z]/.test(pass)) {
		msg = "Must contain at least 1 uppercase character.";
		return { valid: false, message: msg };
	}
	if (!/[0-9]/.test(pass)) {
		msg = "Must contain at least 1 digit.";
		return { valid: false, message: msg };
	}
	if (pass.length < 8) {
		msg = "Length must be greater than 7.";
		return { valid: false, message: msg };
	}
	if (pass.length > 49) {
		msg = "Length must be less than 50.";
		return { valid: false, message: msg };
	}

	return { valid: true };
};

export { emailSanitizer, passwordChecker };
