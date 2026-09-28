import type { Request, Response } from "express";
import { PipelineStage, startSession, Types } from "mongoose";
import * as z from "zod";
import { CourseModel } from "../model/course.model.ts";
import { EnrollmentModel } from "../model/enrollment.model.ts";
import { LessonModel } from "./../model/lesson.model.ts";
import { ModuleModel } from "./../model/module.model.ts";
import { ProgressModel } from "../model/progress.model.ts";
import { apiResponse } from "../utils/apiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { AppError, BasicErrorPayloadType } from "../utils/globalErrorHandler.ts";
import { getCoursesQuerySchema, getMyCoursesQuerySchema } from "../utils/validation/course.validation.ts";

const getPublicCoursesHandler = asyncHandler(async (req: Request, res: Response) => {
	const { search, sort, page, limit } = req.query as unknown as z.infer<
		typeof getCoursesQuerySchema
	>;

	const filter: Record<string, unknown> = {
		status: "published",
	};

	// console.log(`${search}-${sort}-${page}-${limit}, test`);

	if (search) {
		filter.$or = [
			{
				title: {
					$regex: search,
					$options: "i",
				},
			},
			{
				description: {
					$regex: search,
					$options: "i",
				},
			},
		];
	}

	const sortOptions: Record<typeof sort, Record<string, 1 | -1>> = {
		newest: { createdAt: -1 },
		oldest: { createdAt: 1 },
		title_asc: { title: 1 },
		title_desc: { title: -1 },
	};

	const skip = (page - 1) * limit;

	// concurrent find and count
	const [courses, total] = await Promise.all([
		CourseModel.find(filter)
			.populate<{ instructor: { _id: Types.ObjectId; name: string; }; }>("instructor", "name")
			.select("_id title thumbnail description instructor createdAt")
			.sort(sortOptions[sort])
			.skip(skip)
			.limit(limit),

		CourseModel.countDocuments(filter),
	]);

	// if (!courses.length) {
	// 	apiResponse(res, 404, "No courses found.");
	// 	return;
	// }

	const data = courses.map((course) => ({
		_id: course._id,
		title: course.title,
		description: course.description,
		thumbnail: course.thumbnail,
		instructor: course.instructor.name,
	}));

	apiResponse(res, 200, "Found course(s).", {
		courses: data,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});

	// apiResponse(res, 200, "Found courses.", data);
	return;
});

const getPublicCourseHandler = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params as Record<string, string>;
	const courseId = String(id);

	if (!Types.ObjectId.isValid(courseId)) {
		apiResponse(res, 400, "Invalid param(s).");
		return;
	}

	const course = await CourseModel.findOne({ _id: courseId, status: "published" })
		.populate<{ instructor: { _id: Types.ObjectId; name: string; }; }>(
			"instructor",
			"name",
		);

	if (!course) {
		apiResponse(res, 400, "Failed to find course details.");
		return;
	}

	let enrolled;

	const isStudent = (!!req.user && req.user.role === "student") ? true : false;
	if (isStudent) {
		enrolled = await EnrollmentModel.findOne({ student: req.user!.id, course: course._id });
	}

	const modules = await ModuleModel.find({ course: course._id }).sort({ order: "asc" }).select("title description");
	const moduleTitles = modules.map((module) => ({
		_id: module._id,
		title: module.title,
		description: module.description,
	}));

	const data = {
		_id: course._id,
		title: course.title,
		description: course.description,
		thumbnail: course.thumbnail,
		instructor: course.instructor.name,
		modules: moduleTitles,
		...(enrolled && { enrolled: true }),
		updated: course.updatedAt,
	};

	apiResponse(res, 200, "Found course details.", data);
	return;
});

const getMyCoursesHandler = asyncHandler(async (req: Request, res: Response) => {
	if (req.user!.role === "instructor") {
		const { search, status, sort, page, limit } = req.query as unknown as z.infer<
			typeof getMyCoursesQuerySchema
		>;

		const filter: Record<string, unknown> = {
			instructor: req.user!.id,
		};

		if (status) {
			filter.status = status;
		}

		if (search) {
			filter.$or = [
				{
					title: {
						$regex: search,
						$options: "i",
					},
				},
				{
					description: {
						$regex: search,
						$options: "i",
					},
				},
			];
		}

		const sortOptions = {
			newest: { updatedAt: -1 },
			oldest: { updatedAt: 1 },
			title_asc: { title: 1 },
			title_desc: { title: -1 },
		} as const;

		const skip = (page - 1) * limit;

		const [courses, total] = await Promise.all([
			CourseModel.find(filter)
				.select("_id title description thumbnail instructor status createdAt updatedAt")
				.populate<{ instructor: { _id: Types.ObjectId; name: string; }; }>("instructor", "name")
				.sort(sortOptions[sort])
				.skip(skip)
				.limit(limit),

			CourseModel.countDocuments(filter),
		]);

		// if (!courses.length) {
		// 	apiResponse(res, 404, "No courses found.");
		// 	return;
		// }

		const data = courses.map((course) => ({
			_id: course._id,
			title: course.title,
			description: course.description,
			thumbnail: course.thumbnail,
			instructor: course.instructor.name,
			added: course.createdAt,
			updated: course.updatedAt,
			status: course.status,
		}));

		apiResponse(res, 200, "Found your courses.", {
			courses: data,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
		return;
	}
	else if (req.user!.role === "student") {
		const { search, sort, page, limit } = req.query as unknown as z.infer<
			typeof getMyCoursesQuerySchema
		>;

		const sortStage = {
			newest: { enrolledAt: -1 },
			oldest: { enrolledAt: 1 },
			title_asc: { "course.title": 1 },
			title_desc: { "course.title": -1 },
		} as const;

		const pipeline: PipelineStage[] = [
			{
				$match: {
					student: new Types.ObjectId(req.user!.id),
				},
			},

			{
				$lookup: {
					from: "courses",
					localField: "course",
					foreignField: "_id",
					as: "course",
				},
			},

			{
				$unwind: "$course",
			},

			{
				$lookup: {
					from: "users",
					localField: "course.instructor",
					foreignField: "_id",
					as: "instructor",
				},
			},

			{
				$unwind: "$instructor",
			},
		];

		if (search) {
			pipeline.push({
				$match: {
					$or: [
						{
							"course.title": {
								$regex: search,
								$options: "i",
							},
						},
						{
							"course.description": {
								$regex: search,
								$options: "i",
							},
						},
					],
				},
			});
		}

		pipeline.push(
			{
				$lookup: {
					from: "modules",
					localField: "course._id",
					foreignField: "course",
					as: "modules",
				},
			},
			{
				$lookup: {
					from: "lessons",
					localField: "modules._id",
					foreignField: "module",
					as: "lessons",
				},
			},
			{
				$addFields: {
					totalLessons: {
						$size: "$lessons",
					},
				},
			},
			{
				$lookup: {
					from: "progresses",
					let: {
						studentId: "$student",
						courseId: "$course._id",
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ["$student", "$$studentId"] },
										{ $eq: ["$course", "$$courseId"] },
										{ $eq: ["$completed", true] },
									],
								},
							},
						},
					],
					as: "completedProgress",
				},
			},
			{
				$addFields: {
					completedLessons: {
						$size: "$completedProgress",
					},
				},
			},
			{
				$addFields: {
					percentage: {
						$cond: [
							{ $eq: ["$totalLessons", 0] },
							0,
							{
								$round: [
									{
										$multiply: [
											{
												$divide: [
													"$completedLessons",
													"$totalLessons",
												],
											},
											100,
										],
									},
									1,
								],
							},
						],
					},
				},
			},
			{
				$facet: {
					courses: [
						{
							$sort: sortStage[sort],
						},

						{
							$skip: (page - 1) * limit,
						},

						{
							$limit: limit,
						},

						{
							$project: {
								_id: "$course._id",
								title: "$course.title",
								description: "$course.description",
								thumbnail: "$course.thumbnail",
								instructor: "$instructor.name",
								enrolledAt: 1,

								progress: {
									totalLessons: "$totalLessons",
									completedLessons: "$completedLessons",
									percentage: "$percentage",
								},
							},
						},
					],

					total: [
						{
							$count: "count",
						},
					],
				},
			},
			{
				$unwind: {
					path: "$total",
					preserveNullAndEmptyArrays: true,
				},
			},
		);

		const [enrollments] = await EnrollmentModel.aggregate(pipeline);

		const total = enrollments?.total?.count ?? 0;

		if (enrollments.length < 1) {
			apiResponse(res, 404, "No courses found.");
			return;
		}

		apiResponse(res, 200, "Found your courses.", {
			courses: enrollments.courses ?? [],
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
		return;
	}
	else {
		apiResponse(res, 400, "Hello admin.");
		return;
	}
});

const getMyCourseHandler = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params as Record<string, string>;
	const courseId = String(id);

	if (!Types.ObjectId.isValid(courseId)) {
		apiResponse(res, 400, "Invalid param(s).");
		return;
	}

	if (req.user!.role === "instructor") {
		const course = await CourseModel.findOne({
			_id: courseId,
			instructor: req.user!.id,
		});

		if (!course) {
			apiResponse(res, 404, "Unable to find the course.");
			return;
		}

		const [courseDetails] = await CourseModel.aggregate([
			{
				$match: {
					_id: new Types.ObjectId(courseId),
				},
			},

			{
				$lookup: {
					from: "users",
					localField: "instructor",
					foreignField: "_id",
					as: "instructor",
				},
			},

			{
				$unwind: "$instructor",
			},

			{
				$lookup: {
					from: "modules",
					let: {
						courseId: "$_id",
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ["$course", "$$courseId"],
								},
							},
						},

						{
							$lookup: {
								from: "lessons",
								let: {
									moduleId: "$_id",
								},
								pipeline: [
									{
										$match: {
											$expr: {
												$eq: ["$module", "$$moduleId"],
											},
										},
									},

									{
										$sort: {
											order: 1,
										},
									},

									{
										$project: {
											_id: 1,
											title: 1,
										},
									},
								],
								as: "lessons",
							},
						},

						{
							$sort: {
								order: 1,
							},
						},

						{
							$project: {
								_id: 1,
								title: 1,
								description: 1,
								order: 1,
								lessons: 1,
							},
						},
					],
					as: "modules",
				},
			},

			{
				$project: {
					_id: 1,
					title: 1,
					description: 1,
					thumbnail: 1,
					instructor: "$instructor.name",
					status: 1,
					createdAt: 1,
					updatedAt: 1,
					modules: 1,
				},
			},
		]);

		if (!courseDetails) {
			apiResponse(res, 404, "Failed to find the course details.");
			return;
		}

		apiResponse(res, 200, "Found the course details.", courseDetails);
		return;
	}
	else if (req.user!.role === "student") {
		const enrolled = await EnrollmentModel.findOne({
			course: courseId,
			student: req.user!.id,
		});

		if (!enrolled) {
			apiResponse(res, 404, "Unable to find the course.");
			return;
		}

		const [courseDetails] = await CourseModel.aggregate([
			{
				$match: {
					_id: new Types.ObjectId(courseId),
					status: "published",
				},
			},

			{
				$lookup: {
					from: "users",
					localField: "instructor",
					foreignField: "_id",
					as: "instructor",
				},
			},

			{
				$unwind: "$instructor",
			},

			{
				$lookup: {
					from: "enrollments",
					let: {
						courseId: "$_id",
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ["$course", "$$courseId"] },
										{
											$eq: [
												"$student",
												new Types.ObjectId(req.user!.id),
											],
										},
									],
								},
							},
						},
						{
							$project: {
								_id: 0,
								enrolledAt: 1,
							},
						},
					],
					as: "enrollment",
				},
			},

			{
				$unwind: "$enrollment",
			},

			{
				$lookup: {
					from: "progresses",
					let: {
						studentId: new Types.ObjectId(req.user!.id),
						courseId: "$_id",
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ["$student", "$$studentId"],
										},
										{
											$eq: ["$course", "$$courseId"],
										},
										{
											$eq: ["$completed", true],
										},
									],
								},
							},
						},
						{
							$project: {
								_id: 0,
								lesson: 1,
							},
						},
					],
					as: "completedProgress",
				},
			},

			{
				$lookup: {
					from: "modules",

					let: {
						courseId: "$_id",
						completedLessonIds: {
							$map: {
								input: "$completedProgress",
								as: "progress",
								in: "$$progress.lesson",
							},
						},
					},

					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ["$course", "$$courseId"],
								},
							},
						},

						{
							$lookup: {
								from: "lessons",

								let: {
									moduleId: "$_id",
									completedLessonIds: "$$completedLessonIds",
								},

								pipeline: [
									{
										$match: {
											$expr: {
												$eq: ["$module", "$$moduleId"],
											},
										},
									},

									{
										$sort: {
											order: 1,
										},
									},

									{
										$addFields: {
											completed: {
												$in: [
													"$_id",
													"$$completedLessonIds",
												],
											},
										},
									},

									{
										$project: {
											_id: 1,
											title: 1,
											completed: 1,
										},
									},
								],

								as: "lessons",
							},
						},

						{
							$sort: {
								order: 1,
							},
						},

						{
							$project: {
								_id: 1,
								title: 1,
								description: 1,
								lessons: 1,
							},
						},
					],

					as: "modules",
				},
			},

			{
				$addFields: {
					totalLessons: {
						$sum: {
							$map: {
								input: "$modules",
								as: "module",
								in: {
									$size: "$$module.lessons",
								},
							},
						},
					},
				},
			},

			{
				$addFields: {
					completedLessons: {
						$size: "$completedProgress",
					},
				},
			},

			{
				$addFields: {
					percentage: {
						$cond: [
							{
								$eq: ["$totalLessons", 0],
							},
							0,
							{
								$round: [
									{
										$multiply: [
											{
												$divide: [
													"$completedLessons",
													"$totalLessons",
												],
											},
											100,
										],
									},
									1,
								],
							},
						],
					},
				},
			},

			{
				$project: {
					_id: 1,
					title: 1,
					description: 1,
					thumbnail: 1,
					instructor: "$instructor.name",
					updatedAt: 1,
					enrolledAt: "$enrollment.enrolledAt",
					modules: 1,
					progress: {
						totalLessons: "$totalLessons",
						completedLessons: "$completedLessons",
						percentage: "$percentage",
					},
				},
			},
		]);

		apiResponse(res, 200, "Found the course details.", courseDetails);
		return;
	}
});

const courseEnrollHandler = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params as Record<string, string>;
	const courseId = String(id);

	if (!Types.ObjectId.isValid(courseId)) {
		apiResponse(res, 400, "Invalid param(s).");
		return;
	}

	const course = await CourseModel.findOne({ _id: courseId, status: "published" });

	if (!course) {
		apiResponse(res, 404, "Unable to find the course.");
		return;
	}

	const enrolled = await EnrollmentModel.findOne({ student: req.user!.id, course: course._id });

	const routePath = String(req.route.path).replace(/[\/]+$/, "");
	// enroll or unenroll
	const endpoint = routePath.slice(routePath.lastIndexOf("/") + 1);

	if (endpoint === "enroll") {
		if (enrolled) {
			apiResponse(res, 200, "You are already enrolled.");
		}
		else {
			await EnrollmentModel.create({
				student: req.user!.id,
				course: course._id,
			});
			apiResponse(res, 201, "Successfully enrolled.");
		}
	}
	else {
		if (enrolled) {
			await EnrollmentModel.deleteOne({ student: req.user!.id, course: course._id });
			await ProgressModel.deleteMany({ student: req.user!.id, course: course._id });
			apiResponse(res, 201, "Progress cleared and successfully unenrolled.");
		}
		else {
			apiResponse(res, 200, "You are not enrolled.");
		}
	}
	return;
});

const makeCourseHandler = asyncHandler(async (req: Request, res: Response) => {
	const { title: iTitle, description: iDescription, thumbnail: iThumbnail } = req.body as {
		title: string;
		description: string;
		thumbnail: string;
	};

	const title = String(iTitle), description = String(iDescription), thumbnail = String(iThumbnail);

	const course = await CourseModel.create({
		title,
		description,
		thumbnail,
		instructor: req.user!.id,
		status: "draft",
	});

	apiResponse(res, 201, "Course added successfully.", {
		_id: course._id,
		title: course.title,
		description: course.description,
		thumbnail: course.thumbnail,
		status: course.status,
		instructor: course.instructor.toString(),
		updated: course.updatedAt,
	});
	return;
});

const publishCourseHandler = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params as Record<string, string>;
	const courseId = String(id);

	if (!Types.ObjectId.isValid(courseId)) {
		apiResponse(res, 400, "Invalid param(s).");
		return;
	}

	const course = await CourseModel.findOne({ _id: courseId, instructor: req.user!.id });

	if (!course) {
		apiResponse(res, 404, "Unable to find the course.");
		return;
	}
	if (course.status === "published") {
		apiResponse(res, 400, "Course is already published.");
		return;
	}

	const modules = await ModuleModel.find({ course: course._id }).distinct("_id");

	if (!modules.length) {
		apiResponse(res, 400, "Must contain at least 1 module.");
		return;
	}

	const lessons = await LessonModel.find({ module: { $in: modules } }).distinct("module");

	if (lessons.length < modules.length) {
		apiResponse(res, 400, "Each module must contain at least 1 lesson.");
		return;
	}

	course.status = "published";
	await course.save();

	apiResponse(res, 201, "Course published successfully.", {
		_id: course._id,
		title: course.title,
		thumbnail: course.thumbnail,
		status: course.status,
		updated: course.updatedAt,
		description: course.description,
		createdAt: course.createdAt,
		updatedAt: course.updatedAt,
	});
	return;
});

const updateCourseHandler = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params as Record<string, string>;
	const courseId = String(id);
	const { title: iTitle, description: iDescription, thumbnail: iThumbnail } = req.body as {
		title?: string;
		description?: string;
		thumbnail?: string;
	};

	const title = iTitle ? String(iTitle.trim()) : iTitle;
	const description = iDescription ? String(iDescription.trim()) : iDescription;
	const thumbnail = iThumbnail ? String(iThumbnail.trim()) : iThumbnail;

	if (!Types.ObjectId.isValid(courseId)) {
		apiResponse(res, 400, "Invalid param(s).");
		return;
	}

	const course = await CourseModel.findOne({
		_id: courseId,
		instructor: req.user!.id,
	});

	if (!course) {
		apiResponse(res, 404, "Unable to find the course.");
		return;
	}

	if (!(title === course.title && description === course.description && thumbnail === course.thumbnail)) {
		if (title) {
			course.title = title;
		}
		if (description) {
			course.description = description;
		}
		if (thumbnail) {
			course.thumbnail = thumbnail;
		}
		await course.save();
	}

	apiResponse(res, 200, "Course successfully updated.", {
		_id: course._id,
		title: course.title,
		description: course.description,
		thumbnail: course.thumbnail,
		status: course.status,
		updated: course.updatedAt,
	});
	return;
});

const deleteCourseHandler = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params as Record<string, string>;
	const courseId = String(id);

	if (!Types.ObjectId.isValid(courseId)) {
		apiResponse(res, 400, "Invalid param(s).");
		return;
	}

	const course = await CourseModel.findOne({
		_id: courseId,
		instructor: req.user!.id,
	});

	if (!course) {
		apiResponse(res, 404, "Unable to find the course.");
		return;
	}

	const dbSession = await startSession();

	try {
		await dbSession.withTransaction(async () => {
			await ProgressModel.deleteMany({ course: course._id }, { session: dbSession });
			await EnrollmentModel.deleteMany({ course: course._id }, { session: dbSession });
			const moduleIds = await ModuleModel.find({ course: course._id }).distinct("_id").session(dbSession);
			await LessonModel.deleteMany({ module: { $in: moduleIds } }, { session: dbSession });
			await ModuleModel.deleteMany({ course: course._id }, { session: dbSession });
			await CourseModel.deleteOne({ _id: course._id }, { session: dbSession });
		});
	}
	finally {
		await dbSession.endSession();
	}

	apiResponse(res, 200, "Course deleted successfully.");
	return;
});

export {
	courseEnrollHandler,
	deleteCourseHandler,
	getMyCourseHandler,
	getMyCoursesHandler,
	getPublicCourseHandler,
	getPublicCoursesHandler,
	makeCourseHandler,
	publishCourseHandler,
	updateCourseHandler,
};
