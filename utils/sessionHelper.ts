import ms from "ms";
import { config } from "../config/envConfig.ts";

const crypto = await import("node:crypto");

export function generateSessionToken(): string {
	return crypto.randomBytes(32).toString("hex");
}

export function getSessionExpiration(): Date {
	const lifetime = ms(config.sExpiry);

	const expiration = new Date(Date.now() + lifetime);

	return expiration;
}
