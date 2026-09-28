import { getName } from "country-list";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import * as z from "zod";
import { passwordChecker } from "../validationHelper";

const countryCodes = getCountries().map((country) => ({
	name: getName(country) || country,
	nameCode: country,
	dialCode: `+${getCountryCallingCode(country)}`,
}));

// removing duplicate codes, for example both usa and canada have +1
const countryDialCodes = [...(new Set(countryCodes.map(val => val.dialCode)))];
const countries = [...(new Set(countryCodes.map(val => val.name)))];

const registrationSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, "Name must be at least 2 characters.")
		.max(70, "Name must not exceed 70 characters."),

	email: z
		.email("Please provide a valid email address."),

	password: z
		.string()
		.min(8, "Password must be at least 8 characters.")
		.max(49, "Password must not exceed 49 characters."),

	countryCode: z
		.enum(countryDialCodes)
		.optional(),

	phone: z
		.string()
		.trim()
		.regex(
			/^[0-9\-. ]+$/,
			"Must not contain any characters other than numbers, spaces, parenthesis, dots and hyphens.",
		)
		.min(4, "Should not contain less than 4 characters.")
		.max(21, "Should not contain more than 21 characters.")
		.optional(),

	city: z
		.string()
		.optional(),

	country: z
		.enum(countries)
		.optional(),

	address: z
		.string()
		.trim()
		.max(200, "Address must not exceed 200 characters.")
		.optional(),

	role: z
		.enum(["student", "instructor"]),
})
	.strict()
	.superRefine((data, ctx) => {
		const hasCountryCode = !!data.countryCode;
		const hasPhone = !!data.phone;
		const passValidate = passwordChecker(data.password);

		if (!hasCountryCode && hasPhone) {
			ctx.addIssue({
				code: "custom",
				message: "Country code is required when phone number is provided.",
				path: ["countryCode"],
			});
		}

		if (hasCountryCode && !hasPhone) {
			ctx.addIssue({
				code: "custom",
				message: "Phone number is required when country code is provided.",
				path: ["phone"],
			});
		}

		if (!passValidate.valid) {
			ctx.addIssue({
				code: "custom",
				message: passValidate.message,
				path: ["password"],
			});
		}
	});

const updateProfileSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, "Name must be at least 2 characters.")
		.max(70, "Name must not exceed 70 characters.")
		.optional(),

	countryCode: z
		.enum(countryDialCodes, "Invalid country code.")
		.optional(),

	phone: z
		.string()
		.trim()
		.regex(
			/^[0-9\-. ]+$/,
			"Must not contain any characters other than numbers, spaces, parenthesis, dots and hyphens.",
		)
		.min(4, "Should not contain less than 4 characters.")
		.max(21, "Should not contain more than 21 characters.")
		.optional(),

	city: z
		.string()
		.optional(),

	country: z
		.enum(countries, "Invalid country.")
		.optional(),

	address: z
		.string()
		.trim()
		.max(200, "Address must not exceed 200 characters.")
		.optional(),
})
	.strict()
	.superRefine((data, ctx) => {
		const hasCountryCode = !!data.countryCode;
		const hasPhone = !!data.phone;

		if (!hasCountryCode && hasPhone) {
			ctx.addIssue({
				code: "custom",
				message: "Country code is required when phone number is provided.",
				path: ["countryCode"],
			});
		}

		if (hasCountryCode && !hasPhone) {
			ctx.addIssue({
				code: "custom",
				message: "Phone number is required when country code is provided.",
				path: ["phone"],
			});
		}
	});

const otpSchema = z.object({
	email: z
		.email("Please provide a valid email address"),

	otp: z
		.string()
		.length(8, "OTP must have 8 characters.")
		.refine((val) => /^[a-zA-Z0-9]+$/.test(val), {
			error: "Contains invalid character(s).",
		}),
})
	.strict();

const resetPassSchema = z.object({
	pass: z
		.string()
		.min(8, "Password must be at least 8 characters.")
		.max(49, "Password must not exceed 49 characters."),

	repass: z
		.string()
		.min(8, "Password must be at least 8 characters.")
		.max(49, "Password must not exceed 49 characters."),

	method: z
		.enum(["otp"])
		.optional(),
})
	.strict()
	.superRefine((data, ctx) => {
		const passValidate = passwordChecker(data.pass);
		const repassValidate = passwordChecker(data.repass);

		if (data.pass !== data.repass) {
			ctx.addIssue({
				code: "custom",
				message: "Passwords do not match.",
			});
		}

		if (!(passValidate.valid && repassValidate.valid)) {
			ctx.addIssue({
				code: "custom",
				message: passValidate.valid ? repassValidate.message : passValidate.message,
			});
		}
	});

const loginSchema = z.object({
	email: z
		.email(),

	password: z
		.string()
		.min(8, "Password must be at least 8 characters.")
		.max(49, "Password must not exceed 49 characters.")
		.superRefine((val, ctx) => {
			const passValidate = passwordChecker(val);

			if (!passValidate.valid) {
				ctx.addIssue({
					code: "custom",
					message: passValidate.message,
				});
			}
		}),
})
	.strict();

export {
	countries,
	countryCodes,
	countryDialCodes,
	loginSchema,
	otpSchema,
	registrationSchema,
	resetPassSchema,
	updateProfileSchema,
};
