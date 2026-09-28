import type { Request, Response } from "express";
import { Error } from "mongoose";
import UserModel from "../model/user.model.ts";
import { apiResponse } from "../utils/apiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { AppError } from "../utils/globalErrorHandler.ts";
import { verifyTokenReg } from "../utils/obfuscationHelper.ts";

const emailVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id: token } = req.params as Record<string, string>;

    const result = verifyTokenReg(token);

    if (result instanceof Error) {
        throw result;
    }
    else {
        const cleanId = result.replace(/[^a-zA-Z0-9]+/g, "");
        const user = await UserModel.findOne({ _id: cleanId });
        if (!user) {
            throw new AppError("This verification link is either invalid or expired!", 400);
        }
        else {
            if (user.verified === true) {
                apiResponse(res, 400, `This verification link is either invalid or expired!`);
                // apiResponse(res, 200, `This account has already been verified!`);
                return;
            }
        }

        const doc = await UserModel.findOneAndUpdate(
            { _id: cleanId, __v: user.__v },
            {
                verified: true,
                $inc: { __v: 1 },
            },
            { returnDocument: "after", runValidators: true },
        );

        if (doc) {
            apiResponse(res, 201, `Your account has successfully been verified!. You can login now.`, doc);
        }
        else {
            throw new AppError("Verification failed!", 500);
        }
    }
});

export default emailVerificationHandler;