import { model, Schema, Types } from "mongoose";

interface Course {
	title: string;
	description: string;
	instructor: Types.ObjectId;
	thumbnail?: string;
	status: "draft" | "published";
	createdAt: Date;
	updatedAt: Date;
}

const courseSchema = new Schema<Course>({
	title: {
		type: String,
		min: 3,
		max: 70,
		required: true,
		trim: true,
	},
	description: {
		type: String,
		min: 10,
		max: 400,
		required: true,
		trim: true,
	},
	instructor: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	thumbnail: {
		type: String,
		trim: true,
	},
	status: {
		type: String,
		enum: ["draft", "published"],
		default: "draft",
		required: true,
	},
}, {
	timestamps: true,
});

export const CourseModel = model<Course>("Course", courseSchema);
export default CourseModel;
export type { Course };
