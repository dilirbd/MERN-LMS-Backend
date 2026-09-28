import { parsePhoneNumberWithError } from "libphonenumber-js";
import { model, Schema } from "mongoose";
import type { HydratedDocument, ValidateOpts } from "mongoose";
import { countries, countryCodes, countryDialCodes } from "../utils/validation/auth.validation.ts";

type UserRole = "student" | "instructor" | "admin";
const roleMap: Record<UserRole, true> = { student: true, instructor: true, admin: true };
const Roles = Object.keys(roleMap) as UserRole[];

interface User {
	name: string;
	email: string;
	cleanedEmail: string;
	password: string;
	countryCode: string;
	phone?: string;
	resetToken?: string;
	resetTokenStatus?: string;
	verified: boolean;
	address?: string;
	city?: string;
	country?: string;
	role: UserRole;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>({
	name: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: [true, "Email is required!"],
		minLength: [6, "Your email address is too short!"],
		maxLength: [254, "Your email address is too long!"],
		lowercase: true,
		trim: true,
	},
	cleanedEmail: {
		type: String,
		required: true,
		minLength: 6,
		maxLength: 254,
		lowercase: true,
		select: false,
	},
	password: {
		type: String,
		required: [true, "Password is required!"],
		minLength: [8, "Password must have at least 8 characters"],
		maxLength: [60, "Password is too long!"],
		select: false,
	},
	countryCode: {
		type: String,
		default: "+880",
		enum: countryDialCodes,
		select: false,
	},
	phone: {
		type: String,
		set: (val: string | undefined) => {
			if (!val) return val;
			return val.replace(/[\s\-\(\)\.]/g, "");
		},
		validate: [
			{
				validator: (val: string) => /^\+?\d{6,14}$/.test(val),
				message: "Invalid phone number!",
			} as ValidateOpts<string, UserDocument>,
			{
				validator: function(this: User) {
					if (this.phone && this.phone.length > 0) {
						return this.countryCode && this.countryCode.length > 0; // countryCode must be provided if phone is provided
					}
					return true; // no phone provided, so countryCode isn't needed
				},
				message: "Country code is required when phone number is provided!",
			} as ValidateOpts<string, UserDocument>,
		],
		select: false,
	},
	resetToken: {
		type: String,
		default: null,
		select: false,
	},
	resetTokenStatus: {
		type: String,
		enum: ["pending", "updating", null],
		default: null,
		select: false,
	},
	verified: {
		type: Boolean,
		default: false,
		required: true,
	},
	address: {
		type: String,
		trim: true,
		select: false,
	},
	city: {
		type: String,
		trim: true,
		select: false,
	},
	country: {
		type: String,
		trim: true,
		enum: countries,
		select: false,
	},
	role: {
		type: String,
		default: "student",
		enum: Roles,
		trim: true,
		required: true,
	},
	isActive: {
		type: Boolean,
		default: true,
		required: true,
	},
}, {
	timestamps: true,
});

userSchema.index({ "email": 1 }, { unique: true });
userSchema.index({ "cleanedEmail": 1 }, { unique: true });
userSchema.index({ "password": 1 }, { unique: true });
userSchema.index({ "countryCode": 1, "phone": 1 }, {
	unique: true,
	partialFilterExpression: { phone: { $exists: true } },
});

userSchema.pre("save", function(this: UserDocument) {
	try {
		if (!this.phone || !this.phone.trim().length || !this.countryCode || !this.countryCode.trim().length) return;
		let phone = this.phone;
		const countryCode = this.countryCode;
		if (!phone.startsWith("+")) {
			if (countryCode && phone.startsWith(countryCode.slice(1))) {
				phone = "+" + phone;
				const parsedNumber = parsePhoneNumberWithError(phone.slice(0));
				this.countryCode = "+" + parsedNumber.countryCallingCode;
				// only stores the national (significant) number
				this.phone = parsedNumber.nationalNumber;
			}
			else {
				// for example, for phone 01714554959 and default countryCode +880, removes the 0 prefix in phone
				const parsedNumber = parsePhoneNumberWithError(
					this.phone.slice(0),
					countryCodes.find((val) => val.dialCode === countryCode.slice(0))?.nameCode,
				);
				this.phone = parsedNumber.nationalNumber;
			}
		}
		else {
			const parsedNumber = parsePhoneNumberWithError(phone.slice(0));
			this.countryCode = "+" + parsedNumber.countryCallingCode;
			this.phone = parsedNumber.nationalNumber;
		}
	}
	catch (err) {
		console.log("Error from userSchema pre-save hook: ", err);
	}
});

userSchema.set("toJSON", {
	transform: (doc, ret: Record<string, any>) => {
		const { __v, createdAt, updatedAt, ...remaining } = ret;
		return remaining;
	},
});

export const UserModel = model<User>("User", userSchema);
export default UserModel;
export type { User, UserRole };
