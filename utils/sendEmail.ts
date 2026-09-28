import type { Request } from "express";
import { config } from "../config/envConfig.ts";
import { AppError, EmailSanitizeError } from "../utils/globalErrorHandler.ts";
import { nodemailerTransporter } from "../utils/mailerTransporter.ts";
import { generateTokenPass, generateTokenReg } from "../utils/obfuscationHelper.ts";
import { emailSanitizer } from "../utils/validationHelper.ts";

interface NodemailerErrorType {
	code?: string;
	command?: string;
	response?: string;
	responseCode?: number;
}
type SendResetLinkMode = "otp" | "link";
interface SendResetParams {
	id: string;
	mode: SendResetLinkMode;
	phone?: string;
}

const sendVerificationLink = async (req: Request, id: string) => {
	try {
		const cleanEmail = emailSanitizer(req.body.email);
		const encodedToken = generateTokenReg(id);
		// the req obj here is coming from hitting /register, so the originalUrl is /api/vX/auth/register
		const verificationUrl = `${config.furl}/verify-email?token=${encodedToken}`;

		console.log(verificationUrl);

		const info = await nodemailerTransporter.sendMail({
			from: config.authUser,
			to: req.body.email,
			subject: `Email Verification for DDR LMS`,
			// ai generated. Gmail is trash, it barely supports any styling and it will annihilate layouts and styles.
			html: `
            <!DOCTYPE html>
            <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="color-scheme" content="dark light">
                <meta name="supported-color-schemes" content="dark light">
                <title>Verify Your Email</title>
                <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #1a1a1a;">
                
                <!-- Main Wrapper -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1a1a;">
                    <tr>
                        <td align="center" style="padding: 20px 0;">
                            
                            <!-- Email Container (max-width: 600px) -->
                            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #242424; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                
                                <!-- Header -->
                                <tr>
                                    <td style="background-color: #5a4a3a; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
                                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Verify Your Email</h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 30px; font-size: 16px; line-height: 1.6; color: #d4d4d4;">
                                        <p style="margin: 0 0 20px 0; color: #d4d4d4; font-size: 15px;">
                                            Thank you for registering! Please click the button below to verify your email address and activate your account.
                                        </p>
                                        
                                        <!-- Bulletproof Button -->
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td align="center" style="padding: 30px 0;">
                                                    <!--[if mso]>
                                                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${verificationUrl}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="10%" strokecolor="#6b8e5a" fillcolor="#6b8e5a">
                                                    <w:anchorlock/>
                                                    <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:17px;font-weight:600;">Verify Email Address</center>
                                                    </v:roundrect>
                                                    <![endif]-->
                                                    <!--[if !mso]><!-- -->
                                                    <a href="${verificationUrl}" style="display: inline-block; padding: 14px 35px; background-color: #6b8e5a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 17px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">Verify Email Address</a>
                                                    <!--<![endif]-->
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Divider -->
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="padding: 5px 0 25px 0;">
                                                    <hr style="border: none; border-top: 1px solid #333333; margin: 0;">
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Fallback Link Box -->
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left: 4px solid #8b7355; background-color: #2a2a2a; border-radius: 4px;">
                                            <tr>
                                                <td style="padding: 15px; font-size: 14px; line-height: 1.5;">
                                                    <p style="margin: 0; color: #a0a0a0;">
                                                        <strong style="color: #e8ceb0;">Button not working?</strong><br>
                                                        Copy and paste this link in your browser:<br>
                                                        <a href="${verificationUrl}" style="word-break: break-all; font-size: 13px; color: #c4a97d !important; text-decoration-color: #c4a97d">${verificationUrl}</span>
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Spacer -->
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr><td style="height: 20px; line-height: 20px;">&nbsp;</td></tr>
                                        </table>
                                        
                                        <!-- Security Notice -->
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #4a3a28; border-radius: 6px; background-color: #2d2518;">
                                            <tr>
                                                <td style="padding: 12px 15px; font-size: 13px; line-height: 1.5;">
                                                    <p style="margin: 0; color: #c4a97d;">
                                                        🔒 <strong style="color: #d4b87a;">Security Notice:</strong> This link can only be used once and will expire in 15 minutes. Never share this link with anyone.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 20px; background-color: #2a2a2a; border-top: 1px solid #333333; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; line-height: 1.6;">
                                        <p style="margin: 0; color: #808080;">
                                            If you didn't make this account, please ignore this email.<br>
                                            © 2026 DDR LMS. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                                
                            </table>
                            <!-- End Container -->
                            
                        </td>
                    </tr>
                </table>
                <!-- End Wrapper -->
                
            </body>
            </html>`,
		});

		console.log(
			`Verification mail sent! Please check your inbox.\nDidn't receive it? Check your spam folder or verify that the address you entered (${req.body.email.trim()}) is correct.`,
			info,
		);
		return info;
	}
	catch (error) {
		if (error instanceof EmailSanitizeError) return error;

		const err = error as NodemailerErrorType;

		console.log("err.responseCode", {
			code: err.code,
			command: err.command,
			response: err.response,
		});

		console.log(err);

		return new AppError<NodemailerErrorType>(
			`Error in sending the registration verification email!: ${err.response}`,
			err.responseCode,
			{
				code: err.code,
				command: err.command,
				response: err.response,
			},
		);
	}
};

const sendReset = async (req: Request, userInfo: SendResetParams) => {
	try {
		const cleanEmail = emailSanitizer(req.body.email);

		// OTP can be sent via both mail and sms (sms has not been implemented)
		if (userInfo.mode === "otp") {
			const encodedToken = generateTokenPass(userInfo.id, true);
			let info;
			if (encodedToken.otpToSend) {
				// send an OTP via sms to the number in userInfo.phone - not implemented
				if (userInfo.phone) {}
				// send an OTP via mail to user's email address
				else {
					info = await nodemailerTransporter.sendMail({
						from: config.authUser,
						to: req.body.email,
						subject: `Reset Password for DDR LMS`,
						html: `
                        <!DOCTYPE html>
                        <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <meta name="color-scheme" content="dark light">
                            <meta name="supported-color-schemes" content="dark light">
                            <title>Reset Your Password</title>
                            <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
                        </head>
                        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #1a1a1a;">
                            
                            <!-- Main Wrapper -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1a1a;">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        
                                        <!-- Email Container (max-width: 600px) -->
                                        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #242424; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                            
                                            <!-- Header -->
                                            <tr>
                                                <td style="background-color: #5a4a3a; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
                                                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Reset Your Password</h1>
                                                </td>
                                            </tr>
                                            
                                            <!-- Content -->
                                            <tr>
                                                <td style="padding: 30px; font-size: 16px; line-height: 1.6; color: #d4d4d4;">
                                                    <p style="margin: 0 0 20px 0; color: #d4d4d4; font-size: 15px;">
                                                        Forgot your password? Please enter the OTP below in our website when prompted to reset your old password and setup a new one.
                                                    </p>
                                                    
                                                    <!-- Button -->
                                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td align="center" style="padding: 30px 0;">
                                                                <!--[if mso]>
                                                                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="10%" strokecolor="#6b8e5a" fillcolor="#6b8e5a">
                                                                <w:anchorlock/>
                                                                <center style="color:#ffffff;font-family:Consolas, monospace;font-size:17px;font-weight:600;">${encodedToken.otpToSend}</center>
                                                                </v:roundrect>
                                                                <![endif]-->
                                                                <!--[if !mso]><!-- -->
                                                                <a href="" style="display: inline-block; padding: 14px 35px; background-color: #6b8e5a; color: #ffffff; text-decoration: none; border-radius: 6px; font-family:Consolas, monospace; font-size: 17px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">${encodedToken.otpToSend}</a>
                                                                <!--<![endif]-->
                                                            </td>
                                                        </tr>
                                                    </table>
                                                    
                                                    <!-- Divider -->
                                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="padding: 5px 0 25px 0;">
                                                                <hr style="border: none; border-top: 1px solid #333333; margin: 0;">
                                                            </td>
                                                        </tr>
                                                    </table>
                                                    
                                                    <!-- Spacer -->
                                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                        <tr><td style="height: 20px; line-height: 20px;">&nbsp;</td></tr>
                                                    </table>
                                                    
                                                    <!-- Security Notice -->
                                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #4a3a28; border-radius: 6px; background-color: #2d2518;">
                                                        <tr>
                                                            <td style="padding: 12px 15px; font-size: 13px; line-height: 1.5;">
                                                                <p style="margin: 0; color: #c4a97d;">
                                                                    🔒 <strong style="color: #d4b87a;">Security Notice:</strong> This OTP can only be used once and will expire in 10 minutes. Never share this code with anyone.
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                    
                                                </td>
                                            </tr>
                                            
                                            <!-- Footer -->
                                            <tr>
                                                <td style="padding: 20px; background-color: #2a2a2a; border-top: 1px solid #333333; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; line-height: 1.6;">
                                                    <p style="margin: 0; color: #808080;">
                                                        If you didn't make this request, please ignore this email.<br>
                                                        © 2026 DDR LMS. All rights reserved.
                                                    </p>
                                                </td>
                                            </tr>
                                            
                                        </table>
                                        <!-- End Container -->
                                        
                                    </td>
                                </tr>
                            </table>
                            <!-- End Wrapper -->
                            
                        </body>
                        </html>`,
					});
				}
			}
			return { sentMailInfo: info, hashToStore: encodedToken.tokenHashToStore };
		}
		// Link can only be sent via mail
		else if (userInfo.mode === "link") {
			const encodedToken = generateTokenPass(userInfo.id);
			const ogUrl = req.originalUrl + "/";
			const resetUrl = `${req.protocol}://${req.get("host")}${
				ogUrl.replace(/\?.*?\/+/g, "")
			}/reset/${encodedToken.tokenToSend}`;

			console.log(resetUrl);
			const info = await nodemailerTransporter.sendMail({
				from: config.authUser,
				to: req.body.email,
				subject: `Reset Password for DDR LMS`,
				// ai generated. Gmail is trash, it barely supports any styling and it will annihilate layouts and styles.
				html: `
                    <!DOCTYPE html>
                    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <meta name="color-scheme" content="dark light">
                        <meta name="supported-color-schemes" content="dark light">
                        <title>Reset Your Password</title>
                        <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
                    </head>
                    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #1a1a1a;">
                        
                        <!-- Main Wrapper -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1a1a;">
                            <tr>
                                <td align="center" style="padding: 20px 0;">
                                    
                                    <!-- Email Container (max-width: 600px) -->
                                    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #242424; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                        
                                        <!-- Header -->
                                        <tr>
                                            <td style="background-color: #5a4a3a; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
                                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Reset Your Password</h1>
                                            </td>
                                        </tr>
                                        
                                        <!-- Content -->
                                        <tr>
                                            <td style="padding: 30px; font-size: 16px; line-height: 1.6; color: #d4d4d4;">
                                                <p style="margin: 0 0 20px 0; color: #d4d4d4; font-size: 15px;">
                                                    Forgot your password? Please click the button below to reset your old password and setup a new one.
                                                </p>
                                                
                                                <!-- Bulletproof Button -->
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                    <tr>
                                                        <td align="center" style="padding: 30px 0;">
                                                            <!--[if mso]>
                                                            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${resetUrl}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="10%" strokecolor="#6b8e5a" fillcolor="#6b8e5a">
                                                            <w:anchorlock/>
                                                            <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:17px;font-weight:600;">Reset Password</center>
                                                            </v:roundrect>
                                                            <![endif]-->
                                                            <!--[if !mso]><!-- -->
                                                            <a href="${resetUrl}" style="display: inline-block; padding: 14px 35px; background-color: #6b8e5a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 17px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">Reset Password</a>
                                                            <!--<![endif]-->
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Divider -->
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                    <tr>
                                                        <td style="padding: 5px 0 25px 0;">
                                                            <hr style="border: none; border-top: 1px solid #333333; margin: 0;">
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Fallback Link Box -->
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left: 4px solid #8b7355; background-color: #2a2a2a; border-radius: 4px;">
                                                    <tr>
                                                        <td style="padding: 15px; font-size: 14px; line-height: 1.5;">
                                                            <p style="margin: 0; color: #a0a0a0;">
                                                                <strong style="color: #e8ceb0;">Button not working?</strong><br>
                                                                Copy and paste this link in your browser:<br>
                                                                <a href="${resetUrl}" style="word-break: break-all; font-size: 13px; color: #c4a97d !important; text-decoration-color: #c4a97d">${resetUrl}</span>
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Spacer -->
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                    <tr><td style="height: 20px; line-height: 20px;">&nbsp;</td></tr>
                                                </table>
                                                
                                                <!-- Security Notice -->
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #4a3a28; border-radius: 6px; background-color: #2d2518;">
                                                    <tr>
                                                        <td style="padding: 12px 15px; font-size: 13px; line-height: 1.5;">
                                                            <p style="margin: 0; color: #c4a97d;">
                                                                🔒 <strong style="color: #d4b87a;">Security Notice:</strong> This link can only be used once and will expire in 10 minutes. Never share this link with anyone.
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                            </td>
                                        </tr>
                                        
                                        <!-- Footer -->
                                        <tr>
                                            <td style="padding: 20px; background-color: #2a2a2a; border-top: 1px solid #333333; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; line-height: 1.6;">
                                                <p style="margin: 0; color: #808080;">
                                                    If you didn't make this request, please ignore this email.<br>
                                                    © 2026 DDR LMS. All rights reserved.
                                                </p>
                                            </td>
                                        </tr>
                                        
                                    </table>
                                    <!-- End Container -->
                                    
                                </td>
                            </tr>
                        </table>
                        <!-- End Wrapper -->
                        
                    </body>
                    </html>`,
			});
			return { sentMailInfo: info, hashToStore: encodedToken.tokenHashToStore };
		}
		// sms has not been implemented, this is just placeholder code to prevent an error
		else {
			const encodedToken = generateTokenPass(userInfo.id);
			const ogUrl = req.originalUrl + "/";
			const resetUrl = `${req.protocol}://${req.get("host")}${
				ogUrl.replace(/\?.*?\/+/g, "")
			}/reset/${encodedToken.tokenToSend}`;
			const info = await nodemailerTransporter.sendMail({
				from: config.authUser,
				to: req.body.email,
				subject: `Reset Password for DDR LMS`,
				// ai generated. Gmail is trash, it barely supports any styling and it will annihilate layouts and styles.
				html: `
                    <!DOCTYPE html>
                    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <meta name="color-scheme" content="dark light">
                        <meta name="supported-color-schemes" content="dark light">
                        <title>Reset Your Password</title>
                        <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
                    </head>
                    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #1a1a1a;">
                        
                        <!-- Main Wrapper -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1a1a;">
                            <tr>
                                <td align="center" style="padding: 20px 0;">
                                    
                                    <!-- Email Container (max-width: 600px) -->
                                    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #242424; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                        
                                        <!-- Header -->
                                        <tr>
                                            <td style="background-color: #5a4a3a; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
                                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Reset Your Password</h1>
                                            </td>
                                        </tr>
                                        
                                        <!-- Content -->
                                        <tr>
                                            <td style="padding: 30px; font-size: 16px; line-height: 1.6; color: #d4d4d4;">
                                                <p style="margin: 0 0 20px 0; color: #d4d4d4; font-size: 15px;">
                                                    Forgot your password? Please click the button below to reset your old password and setup a new one.
                                                </p>
                                                
                                                <!-- Bulletproof Button -->
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                    <tr>
                                                        <td align="center" style="padding: 30px 0;">
                                                            <!--[if mso]>
                                                            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${resetUrl}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="10%" strokecolor="#6b8e5a" fillcolor="#6b8e5a">
                                                            <w:anchorlock/>
                                                            <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:17px;font-weight:600;">Reset Password</center>
                                                            </v:roundrect>
                                                            <![endif]-->
                                                            <!--[if !mso]><!-- -->
                                                            <a href="${resetUrl}" style="display: inline-block; padding: 14px 35px; background-color: #6b8e5a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 17px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">Reset Password</a>
                                                            <!--<![endif]-->
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Divider -->
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                    <tr>
                                                        <td style="padding: 5px 0 25px 0;">
                                                            <hr style="border: none; border-top: 1px solid #333333; margin: 0;">
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Fallback Link Box -->
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left: 4px solid #8b7355; background-color: #2a2a2a; border-radius: 4px;">
                                                    <tr>
                                                        <td style="padding: 15px; font-size: 14px; line-height: 1.5;">
                                                            <p style="margin: 0; color: #a0a0a0;">
                                                                <strong style="color: #e8ceb0;">Button not working?</strong><br>
                                                                Copy and paste this link in your browser:<br>
                                                                <a href="${resetUrl}" style="word-break: break-all; font-size: 13px; color: #c4a97d !important; text-decoration-color: #c4a97d">${resetUrl}</span>
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Spacer -->
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                    <tr><td style="height: 20px; line-height: 20px;">&nbsp;</td></tr>
                                                </table>
                                                
                                                <!-- Security Notice -->
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #4a3a28; border-radius: 6px; background-color: #2d2518;">
                                                    <tr>
                                                        <td style="padding: 12px 15px; font-size: 13px; line-height: 1.5;">
                                                            <p style="margin: 0; color: #c4a97d;">
                                                                🔒 <strong style="color: #d4b87a;">Security Notice:</strong> This link can only be used once and will expire in 10 minutes. Never share this link with anyone.
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                            </td>
                                        </tr>
                                        
                                        <!-- Footer -->
                                        <tr>
                                            <td style="padding: 20px; background-color: #2a2a2a; border-top: 1px solid #333333; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; line-height: 1.6;">
                                                <p style="margin: 0; color: #808080;">
                                                    If you didn't make this request, please ignore this email.<br>
                                                    © 2026 DDR LMS. All rights reserved.
                                                </p>
                                            </td>
                                        </tr>
                                        
                                    </table>
                                    <!-- End Container -->
                                    
                                </td>
                            </tr>
                        </table>
                        <!-- End Wrapper -->
                        
                    </body>
                    </html>`,
			});
			return { sentMailInfo: info, hashToStore: encodedToken.tokenHashToStore };
		}
	}
	catch (error) {
		if (error instanceof EmailSanitizeError) return error;

		const err = error as NodemailerErrorType;

		return new AppError<NodemailerErrorType>(
			"Error in sending the registration verification email!",
			err.responseCode,
			{
				code: err.code,
				command: err.command,
				response: err.response,
			},
		);
	}
};

export { sendReset, sendVerificationLink };
