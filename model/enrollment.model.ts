import { model, Schema, Types } from "mongoose";

interface Enrollment {
	student: Types.ObjectId;
	course: Types.ObjectId;
	enrolledAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

const enrollmentSchema = new Schema<Enrollment>({
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
	enrolledAt: {
		type: Date,
		default: Date.now,
		required: true,
	},
}, {
	timestamps: true,
});

enrollmentSchema.index(
	{ student: 1, course: 1 },
	{ unique: true },
);

export const EnrollmentModel = model<Enrollment>("Enrollment", enrollmentSchema);
export default EnrollmentModel;
export type { Enrollment };
