import "dotenv/config";
import ms from "ms";

const envVariables = {
	"DB_URL": "DB_URL",
	"NM_AUTH_USER": "NM_AUTH_USER",
	...((process.env.NM_AUTH_TYPE == "login" || !process.env.NM_AUTH_TYPE) && {
		"NM_AUTH_PASS": "NM_AUTH_PASS",
	}),
	...((process.env.NM_AUTH_TYPE == "oauth2") && {
		"OAUTH_CLIENT_ID": "OAUTH_CLIENT_ID",
		"OAUTH_CLIENT_SECRET": "OAUTH_CLIENT_SECRET",
		"OAUTH_REFRESH_TOKEN": "OAUTH_REFRESH_TOKEN",
	}),
	"VERIFY_LINK_SECRET": "VERIFY_LINK_SECRET",
	"VERIFY_LINK_KEY": "VERIFY_LINK_KEY",
	"ACCESS_SECRET": "ACCESS_SECRET",
	"ACCESS_EXPIRY": "ACCESS_EXPIRY",
	"REFRESH_SECRET": "REFRESH_SECRET",
	"REFRESH_EXPIRY": "REFRESH_EXPIRY",
	"OTP_SECRET": "OTP_SECRET",
	"OTP_SECRET2": "OTP_SECRET2",
	"OTP_FILLER_SECRET": "OTP_FILLER_SECRET",
	"FRONTEND_URL": "FRONTEND_URL",
	"SESSION_SECRET": "SESSION_SECRET",
	"SESSION_LIFE": "SESSION_LIFE",
} as const;

Object.keys(envVariables).forEach((item) => {
	if (!process.env[item]) {
		throw new Error("Missing required environment variable(s)!");
	}
});

export const config = {
	port: Number(process.env.PORT) || 4000,
	nodeEnv: process.env.NODE_ENV as string || "prod",
	baseUrl: process.env.BASE_API_ROUTE as string || "/api",
	dbUrl: process.env.DB_URL as string || "",
	authType: process.env.NM_AUTH_TYPE as string || "login",
	authUser: process.env.NM_AUTH_USER as string || "",
	...((process.env.NM_AUTH_TYPE == "login") && {
		authPass: process.env.NM_AUTH_PASS as string || "",
	}),
	...((process.env.NM_AUTH_TYPE == "oauth2") && {
		oauthCid: process.env.OAUTH_CLIENT_ID as string || "",
		oauthSecret: process.env.OAUTH_CLIENT_SECRET as string || "",
		oauthRefreshToken: process.env.OAUTH_REFRESH_TOKEN as string || "",
	}),
	vLinkSecret: process.env.VERIFY_LINK_SECRET as string || "a-secret-very-string",
	vLinkKey: process.env.VERIFY_LINK_KEY as string || "a-secret-very-secret-string",
	aTSecret: process.env.ACCESS_SECRET as string || "access-token-not-as-secret-important",
	aTExpiry: process.env.ACCESS_EXPIRY as ms.StringValue || "10m",
	rTSecret: process.env.REFRESH_SECRET as string || "refresh-token-secret-important-more",
	rTExpiry: process.env.REFRESH_EXPIRY as ms.StringValue || "1d",
	otpTSecret: process.env.OTP_SECRET as string || "why-are-there-so-many-secrets",
	otpT2Secret: process.env.OTP_SECRET2 as string || "many-there-secrets-how-why-are-so",
	otpFSecret: process.env.OTP_FILLER_SECRET as string || "yet-another-secret-otp-now",
	furl: process.env.FRONTEND_URL as string || "http://localhost:5173",
	sSecret: process.env.SESSION_SECRET as string || "tokens_hashing_secret_session_for",
	sExpiry: process.env.SESSION_LIFE as ms.StringValue || "1d",
};
