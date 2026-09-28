import { model, Schema, Types } from "mongoose";

interface Module {
	course: Types.ObjectId;
	title: string;
	description?: string;
	order: number;
	createdAt: Date;
	updatedAt: Date;
}

const moduleSchema = new Schema<Module>({
	course: {
		type: Types.ObjectId,
		ref: "Course",
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
	order: {
		type: Number,
		required: true,
		min: 1,
	},
}, {
	timestamps: true,
});

moduleSchema.index(
	{ "course": 1, "order": 1 },
	{ unique: true },
);
moduleSchema.index({ course: 1 });

export const ModuleModel = model<Module>("Module", moduleSchema);
export default ModuleModel;
export type { Module };
