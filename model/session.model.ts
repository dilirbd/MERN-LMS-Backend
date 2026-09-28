import { model, Schema, Types } from "mongoose";

interface Session {
	user: Types.ObjectId;
	token: string;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

const sessionSchema = new Schema<Session>({
	user: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	token: {
		type: String,
		required: true,
		unique: true,
	},
	expiresAt: {
		type: Date,
		required: true,
	},
}, {
	timestamps: true,
});

// TTL index - automatically and periodically delete expired sessions from db
sessionSchema.index(
	{ expiresAt: 1 },
	{ expireAfterSeconds: 0 },
);

export const SessionModel = model<Session>("Session", sessionSchema);
export default SessionModel;
export type { Session };
