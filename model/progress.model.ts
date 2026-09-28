import { model, Schema, Types } from "mongoose";

interface Progress {
	student: Types.ObjectId;
	course: Types.ObjectId;
	lesson: Types.ObjectId;
	completed: boolean;
	completedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

const progressSchema = new Schema<Progress>({
	student: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	course: {
		type: Schema.Types.ObjectId,
		ref: "Course",
		required: true,
	},
	lesson: {
		type: Schema.Types.ObjectId,
		ref: "Lesson",
		required: true,
	},
	completed: {
		type: Boolean,
		default: false,
		required: true,
	},
	completedAt: {
		type: Date,
	},
}, {
	timestamps: true,
});

progressSchema.index(
	{ student: 1, lesson: 1 },
	{ unique: true },
);

export const ProgressModel = model<Progress>("Progress", progressSchema);
export default ProgressModel;
export type { Progress };
