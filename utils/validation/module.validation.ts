import * as z from "zod";

const makeModuleSchema = z.object({
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
		.max(300, "Description must not exceed 300 characters.")
		.optional(),

	order: z
		.int("Order must be a whole number.")
		.min(1, "Order must be greater than 0.")
		.max(150, "Order must not be greater than 150."),
})
	.strict();

const updateModuleSchema = z.object({
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
		.max(300, "Description must not exceed 300 characters.")
		.optional(),

	order: z
		.int()
		.min(1, "Order must be greater than 0.")
		.max(150, "Order must not be greater than 150.")
		.optional(),
})
	.strict()
	.refine((data) => data.title || data.description || data.order, {
		message: "At least one field must be provided.",
	});

export { makeModuleSchema, updateModuleSchema };
