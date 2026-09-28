import * as z from "zod";
import { Schema } from "zod/v3";
import { User } from "../model/user.model.ts";

declare global {
	namespace Express {
		interface Request {
			user?: User & { id: string; };
			sessionId?: string;
		}
	}
}

export {};
