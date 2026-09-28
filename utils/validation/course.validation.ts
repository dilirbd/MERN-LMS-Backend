import * as z from "zod";

const makeCourseSchema = z.object({
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
		.max(400, "Description must not exceed 400 characters."),

	thumbnail: z
		.url("Thumbnail must be a URL.")
		.trim()
		.optional(),
})
	.strict();

const updateCourseSchema = z.object({
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
		.max(400, "Description must not exceed 400 characters.")
		.optional(),

	thumbnail: z
		.url("Thumbnail must be a URL.")
		.trim()
		.optional(),
})
	.strict()
	.refine((data) => data.title || data.description || data.thumbnail, {
		message: "At least one field must be provided.",
	});

const getCoursesQuerySchema = z.object({
	search: z
		.string()
		.trim()
		.regex(/^[\p{L}\p{N}\-_ ]{1,50}$/u, "Contains invalid characters.")
		.optional(),

	sort: z
		.enum(["newest", "oldest", "title_asc", "title_desc"])
		.optional()
		.default("newest"),

	page: z.coerce
		.number()
		.int()
		.min(1)
		.optional()
		.default(1),

	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(50)
		.optional()
		.default(12),
});

const getMyCoursesQuerySchema = z.object({
	search: z
		.string()
		.trim()
		.regex(/^[\p{L}\p{N}\-_ ]{1,50}$/u, "Contains invalid characters.")
		.optional(),

	status: z
		.enum(["draft", "published"])
		.optional(),

	sort: z
		.enum(["newest", "oldest", "title_asc", "title_desc"])
		.optional()
		.default("newest"),

	page: z.coerce
		.number()
		.int()
		.min(1)
		.optional()
		.default(1),

	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(50)
		.optional()
		.default(12),
});

export { getCoursesQuerySchema, getMyCoursesQuerySchema, makeCourseSchema, updateCourseSchema };
