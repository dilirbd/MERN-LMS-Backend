import nodemailer from "nodemailer";
import { config } from "../config/envConfig.ts";

const buildTransporter = () => {
    if (config.authType === "login") {
        return nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: config.authUser,
                pass: config.authPass,
            },
        });
    }

    return nodemailer.createTransport({
        service: "Gmail",
        auth: {
            type: "OAuth2",
            user: config.authUser,
            clientId: config.oauthCid,
            clientSecret: config.oauthSecret,
            refreshToken: config.oauthRefreshToken,
        },
    });
};

const nodemailerTransporter = buildTransporter();

export { nodemailerTransporter };