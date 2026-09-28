import * as z from "zod";

const makeLessonSchema = z.object({
	title: z
		.string()
		.trim()
		.regex(/^[^\r\n\u2028\u2029]*$/u, "Must not contain any new lines.")
		.min(3, "Title must be at least 3 characters.")
		.max(70, "Title must not exceed 70 characters."),

	description: z
		.string()
		.trim()
		.min(10, "Description must be at least 10 characters.")
		.max(2000, "Description must not exceed 2000 characters.")
		.optional(),

	videoUrl: z
		.url("Video url must be a URL.")
		.trim()
		.optional(),

	duration: z
		.int("Duration must be an integer. It is the estimated duration in seconds needed to complete the lesson.")
		.min(1, "Duration must be greater than 0.")
		.max(4320, "Duration must be less than 4320 minutes (3 days).")
		.optional(),

	order: z
		.int("Order must be a whole number.")
		.min(1, "Order must be greater than 0.")
		.max(50, "Order must not be greater than 50."),
})
	.strict()
	.superRefine((data, ctx) => {
		const hasDescription = !!data.description;
		const hasVideo = !!data.videoUrl;

		if (!hasDescription && !hasVideo) {
			ctx.addIssue({
				code: "custom",
				message: "At least one among description and videoUrl is required.",
				path: [],
			});
		}
	});

const updateLessonSchema = z.object({
	title: z
		.string()
		.trim()
		.regex(/^[^\r\n\u2028\u2029]*$/u, "Must not contain any new lines.")
		.min(3, "Title must be at least 3 characters.")
		.max(70, "Title must not exceed 70 characters.")
		.optional(),

	description: z
		.string()
		.trim()
		.min(10, "Description must be at least 10 characters.")
		.max(2000, "Description must not exceed 2000 characters.")
		.optional(),

	videoUrl: z
		.url("Video url must be a URL.")
		.trim()
		.optional(),

	duration: z
		.int("Duration must be an integer. It is the estimated duration in seconds needed to complete the lesson.")
		.min(1, "Duration must be greater than 0.")
		.max(4320, "Duration must be less than 4320 minutes (3 days).")
		.optional(),

	order: z
		.int()
		.min(1, "Order must be greater than 0.")
		.max(50, "Order must not be greater than 50.")
		.optional(),
})
	.strict()
	.refine((data) => data.title || data.description || data.order || data.videoUrl || data.duration, {
		message: "At least one field must be provided.",
	});

export { makeLessonSchema, updateLessonSchema };
