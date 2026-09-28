// import nodemailer from "nodemailer";
// import { config } from "../config/envConfig.ts";

// const buildTransporter = () => {
//     if (config.authType === "login") {
//         return nodemailer.createTransport({
//             service: "Gmail",
//             auth: {
//                 user: config.authUser,
//                 pass: config.authPass,
//             },
//         });
//     }

//     return nodemailer.createTransport({
//         service: "Gmail",
//         auth: {
//             type: "OAuth2",
//             user: config.authUser,
//             clientId: config.oauthCid,
//             clientSecret: config.oauthSecret,
//             refreshToken: config.oauthRefreshToken,
//         },
//     });
// };

// const nodemailerTransporter = buildTransporter();

// export { nodemailerTransporter };

import { google } from "googleapis";

import { config } from "../config/envConfig.ts";

const oauth2Client = new google.auth.OAuth2(
	config.oauthCid,
	config.oauthSecret,
);

oauth2Client.setCredentials({
	refresh_token: config.oauthRefreshToken,
});

const gmail = google.gmail({
	version: "v1",
	auth: oauth2Client,
});

function encodeMessage(message: string): string {
	return Buffer.from(message)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

export async function sendGmail(message: {
	from: string;
	to: string;
	subject: string;
	html: string;
}): Promise<void> {
	const msg = [
		`From: ${message.from}`,
		`To: ${message.to}`,
		`Subject: ${message.subject}`,
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=\"UTF-8\"",
		"",
		message.html,
	].join("\r\n");

	const raw = encodeMessage(msg);

	await gmail.users.messages.send({
		userId: "me",
		requestBody: {
			raw,
		},
	});
}
