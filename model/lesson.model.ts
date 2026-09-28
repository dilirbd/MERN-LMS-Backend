import { model, Schema, Types } from "mongoose";

interface Lesson {
	module: Types.ObjectId;
	title: string;
	description?: string;
	videoUrl?: string;
	duration?: number;
	order: number;
	createdAt: Date;
	updatedAt: Date;
}

const lessonSchema = new Schema<Lesson>({
	module: {
		type: Schema.Types.ObjectId,
		ref: "Module",
		required: true,
	},

	title: {
		type: String,
		required: true,
		trim: true,
	},

	description: {
		type: String,
		trim: true,
	},

	videoUrl: {
		type: String,
		trim: true,
	},

	duration: {
		type: Number,
		min: 1,
	},

	order: {
		type: Number,
		required: true,
		min: 1,
	},
}, {
	timestamps: true,
});

lessonSchema.index(
	{ "module": 1, "order": 1 },
	{ unique: true },
);
lessonSchema.index({ module: 1 });

export const LessonModel = model<Lesson>("Lesson", lessonSchema);
export default LessonModel;
export type { Lesson };
