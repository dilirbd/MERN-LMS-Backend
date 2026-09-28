import type { Request, Response } from "express";
import { startSession, Types } from "mongoose";
import { CourseModel } from "../model/course.model.ts";
import { EnrollmentModel } from "../model/enrollment.model.ts";
import { LessonModel } from "./../model/lesson.model.ts";
import { ModuleModel } from "./../model/module.model.ts";
import { ProgressModel } from "../model/progress.model.ts";
import { apiResponse } from "../utils/apiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { AppError } from "../utils/globalErrorHandler.ts";

const getMyCourseModuleLessonsHandler = asyncHandler(async (req: Request, res: Response) => {
	const { cid, mid } = req.params as Record<string, string>;
	const courseId = String(cid);
	const moduleId = String(mid);

	if (!Types.ObjectId.isValid(courseId) || !Types.ObjectId.isValid(moduleId)) {
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

		const module = await ModuleModel.findOne({
			_id: moduleId,
			course: course._id,
		});

		if (!module) {
			apiResponse(res, 404, "Unable to find the module.");
			return;
		}

		const lessons = await LessonModel.find({ module: module._id }).sort({ order: "asc" });

		if (!lessons.length) {
			apiResponse(res, 404, "No lessons found.");
			return;
		}

		const data = lessons.map((lesson) => ({
			_id: lesson._id,
			course: {
				_id: course._id,
				title: course.title,
			},
			module: {
				_id: module.title,
				title: module.title,
			},
			title: lesson.title,
			description: lesson.description,
			videoUrl: lesson.videoUrl,
			duration: lesson.duration,
			order: lesson.order,
			added: lesson.createdAt,
			updated: lesson.updatedAt,
		}));

		apiResponse(res, 200, "Found the course module lessons.", data);
	}
	else if (req.user!.role === "student") {
		const enrolled = await EnrollmentModel.findOne({ student: req.user!.id, course: courseId })
			.populate<
				{
					course: {
						_id: Types.ObjectId;
						status: string;
						title: string;
					};
				}
			>({
				path: "course",
				match: { status: "published" },
				select: "_id status title",
			});

		if (!(enrolled && enrolled.course)) {
			apiResponse(res, 400, "Unable to find the course.");
			return;
		}

		const module = await ModuleModel.findOne({ _id: moduleId, course: enrolled.course._id });

		if (!module) {
			apiResponse(res, 404, "Unable to find the module.");
			return;
		}

		const lessons = await LessonModel.find({ module: module._id }).sort({ order: "asc" });

		if (!lessons.length) {
			apiResponse(res, 404, "No lessons found.");
			return;
		}

		const data = lessons.map((lesson) => ({
			_id: lesson._id,
			course: {
				_id: enrolled.course._id,
				title: enrolled.course.title,
			},
			module: {
				_id: module.title,
				title: module.title,
			},
			title: lesson.title,
			description: lesson.description,
			videoUrl: lesson.videoUrl,
			duration: lesson.duration,
			added: lesson.createdAt,
			updated: lesson.updatedAt,
		}));

		apiResponse(res, 200, "Found the course module lessons.", data);
	}
	else {
		apiResponse(res, 400, "Hello admin.");
	}

	return;
});

const markCompleteHandler = asyncHandler(async (req: Request, res: Response) => {
	const { cid, mid, lid } = req.params as Record<string, string>;
	const courseId = String(cid), moduleId = String(mid), lessonId = String(lid);

	if (!Types.ObjectId.isValid(courseId) || !Types.ObjectId.isValid(moduleId) || !Types.ObjectId.isValid(lessonId)) {
		apiResponse(res, 400, "Invalid param(s).");
		return;
	}

	const course = await CourseModel.findOne({
		_id: courseId,
		status: "published",
	});

	if (!course) {
		apiResponse(res, 404, "Unable to find the course.");
		return;
	}

	const enrollment = await EnrollmentModel.findOne({
		course: course._id,
		student: req.user!.id,
	});

	if (!enrollment) {
		apiResponse(res, 403, "You are not enrolled in this course.");
		return;
	}

	const module = await ModuleModel.findOne({
		_id: moduleId,
		course: enrollment.course,
	});

	if (!module) {
		apiResponse(res, 404, "Unable to find the module.");
		return;
	}

	const lesson = await LessonModel.findOne({
		_id: lessonId,
		module: module._id,
	});

	if (!lesson) {
		apiResponse(res, 404, "Unable to find the module.");
		return;
	}

	const progress = await ProgressModel.findOne({ student: req.user!.id, lesson: lesson._id });

	if (progress) {
		if (progress.completed) {
			const result = await ProgressModel.updateOne(
				{ _id: progress._id },
				{ $set: { completed: false }, $unset: { completedAt: "" } },
			);

			if (result.modifiedCount > 0) apiResponse(res, 251, "Marked as incomplete.");
			else apiResponse(res, 400, "Failed to mark as incomplete.");
		}
		else {
			const result = await ProgressModel.updateOne(
				{ _id: progress._id },
				{
					$set: { completed: true, completedAt: new Date() },
				},
			);
			if (result.modifiedCount > 0) apiResponse(res, 200, "Marked as complete.");
			else apiResponse(res, 400, "Failed to mark as complete.");
		}
	}
	else {
		await ProgressModel.create({
			student: req.user!.id,
			course: enrollment.course,
			lesson: lesson._id,
			completed: true,
			completedAt: new Date(),
		});
		apiResponse(res, 200, "Marked as complete.");
	}

	return;
});

const makeLessonHandler = asyncHandler(async (req: Request, res: Response) => {
	const { cid, mid } = req.params as Record<string, string>;
	const courseId = String(cid);
	const moduleId = String(mid);
	const { title: iTitle, description: iDescription, order: iOrder, videoUrl: iVideoUrl, duration: iDuration } = req
		.body as {
			title: string;
			description?: string;
			order: number;
			videoUrl?: string;
			duration?: number;
		};

	const title = String(iTitle.trim());
	const description = iDescription ? String(iDescription.trim()) : iDescription;
	const order = Number(iOrder);
	const videoUrl = iVideoUrl ? String(iVideoUrl.trim()) : iVideoUrl;
	const duration = iDuration ? Number(iDuration) : iDuration;

	if (!Types.ObjectId.isValid(courseId) || !Types.ObjectId.isValid(moduleId)) {
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

	const module = await ModuleModel.findOne({
		_id: moduleId,
		course: course._id,
	});

	if (!module) {
		apiResponse(res, 404, "Unable to find the module.");
		return;
	}

	const lessons = await LessonModel.find({ module: module._id }).sort({ order: "asc", createdAt: 1 });

	if (lessons.length === 50) {
		apiResponse(res, 400, "Cannot add more than 50 lessons in one module.");
		return;
	}

	let finalInsertedLesson: typeof lessons[number] | undefined;
	let newUpdatedLessons: typeof lessons | undefined;

	const dbSession = await startSession();

	try {
		const updateResult = await dbSession.withTransaction(async () => {
			const otherInfoToSave = {
				...{ title },
				...(description && { description }),
				...(videoUrl && { videoUrl }),
				...(duration && { duration }),
			};

			const below = lessons.filter(doc => doc.order < order);
			const above = lessons.filter(doc => doc.order >= order);
			let newOrder = below.length + 1;

			const SAFE_OFFSET = 10000;
			const shifted = await LessonModel.updateMany(
				{ module: module._id },
				{ $inc: { order: SAFE_OFFSET } },
				{ session: dbSession },
			);

			if (shifted.modifiedCount !== lessons.length) {
				throw new AppError(
					`Shift mismatch: Expected ${lessons.length} but got ${shifted.modifiedCount}`,
					400,
				);
			}

			const operations = [
				...below.map((doc, index) => {
					if (index + 1 === below.length) newOrder = index + 2;

					console.log("first", below.length, newOrder);

					return {
						updateOne: {
							filter: { _id: doc._id },
							update: { $set: { order: index + 1 } },
						},
					};
				}),
				...above.map((doc, index) => ({
					updateOne: {
						filter: { _id: doc._id },
						update: { $set: { order: index + 1 + newOrder } },
					},
				})),
			];

			const bulkResult = operations.length
				? await LessonModel.bulkWrite(operations, { session: dbSession, ordered: true })
				: { matchedCount: 0, modifiedCount: 0 };

			if (bulkResult.matchedCount !== operations.length) {
				throw new AppError(
					`Bulk mismatch: Expected ${operations.length} but got ${bulkResult.matchedCount}`,
					400,
				);
			}

			[finalInsertedLesson] = await LessonModel.create([{
				module: module._id,
				...otherInfoToSave,
				order: newOrder,
			}], { session: dbSession });

			const updatedLessons = await LessonModel.find(
				{ module: module._id },
				{
					_id: 1,
					order: 1,
					title: 1,
					description: 1,
					createdAt: 1,
					updatedAt: 1,
					module: 1,
					videoUrl: 1,
					duration: 1,
				},
				{ session: dbSession },
			).sort({ order: 1 });

			newUpdatedLessons = updatedLessons;

			const serialMaintained = updatedLessons.every((doc, i) => doc.order === i + 1);
			if (!serialMaintained) {
				throw new AppError("Arranging modules in order failed.", 400);
			}

			return {
				reordered: `${req.user!.id} - add lesson: ${bulkResult.matchedCount} - ${bulkResult.modifiedCount}.`,
			};
		});
		console.log(updateResult);
	}
	finally {
		await dbSession.endSession();
	}

	if (finalInsertedLesson && newUpdatedLessons) {
		apiResponse(
			res,
			201,
			"Lesson added successfully.",
			newUpdatedLessons.map((lesson) => ({
				_id: lesson._id,
				title: lesson.title,
				description: lesson.description,
				order: lesson.order,
				videoUrl: lesson.videoUrl,
				duration: lesson.duration,
				updated: lesson.updatedAt,
				module: {
					_id: lesson.module,
					title: module.title,
				},
				course: {
					_id: module.course,
					title: course.title,
				},
			})),
		);
	}
	else {
		apiResponse(res, 400, "Failed to add the lesson.");
	}
	return;
});

const updateLessonHandler = asyncHandler(async (req: Request, res: Response) => {
	const { cid, mid, lid } = req.params as Record<string, string>;
	const courseId = String(cid), moduleId = String(mid), lessonId = String(lid);
	const { title: iTitle, description: iDescription, order: iOrder, videoUrl: iVideoUrl, duration: iDuration } = req
		.body as {
			title?: string;
			description?: string;
			order?: number;
			videoUrl?: string;
			duration?: number;
		};

	const title = iTitle ? String(iTitle.trim()) : iTitle;
	const description = iDescription ? String(iDescription.trim()) : iDescription;
	const order = iOrder ? Number(iOrder) : iOrder;
	const videoUrl = iVideoUrl ? String(iVideoUrl.trim()) : iVideoUrl;
	const duration = iDuration ? Number(iDuration) : iDuration;

	if (!Types.ObjectId.isValid(courseId) || !Types.ObjectId.isValid(moduleId) || !Types.ObjectId.isValid(lessonId)) {
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

	const module = await ModuleModel.findOne({
		_id: moduleId,
		course: course._id,
	});

	if (!module) {
		apiResponse(res, 404, "Unable to find the module.");
		return;
	}

	const lessons = await LessonModel.find({ module: module._id }).sort({ order: "asc", createdAt: 1 });
	const lesson = lessons.find(doc => doc._id.equals(lessonId));

	if (!lesson) {
		apiResponse(res, 404, "Unable to find the lesson.");
		return;
	}

	const collidingLesson = lessons.find(doc => doc.order === order);

	let finalUpdatedLesson: typeof lessons[number] | undefined;

	let newUpdatedLessons: typeof lessons | undefined;

	if (
		order !== lesson.order || title !== lesson.title || description !== lesson.description
		|| videoUrl !== lesson.videoUrl || duration !== lesson.duration
	) {
		if (order && order !== lesson.order) {
			// put collidingLesson here if you want to re-order only when collision occurs and un-comment the else block
			if (true) {
				const dbSession = await startSession();

				try {
					const updateResult = await dbSession.withTransaction(async () => {
						const otherInfoToSave = {
							...(title && { title }),
							...(description && { description }),
							...(videoUrl && { videoUrl }),
							...(duration && { duration }),
						};

						const rankDown = order > lesson.order;

						const below = lessons.filter(doc =>
							rankDown
								? doc.order <= order && !doc._id.equals(lesson._id)
								: doc.order < order && !doc._id.equals(lesson._id)
						);
						const target = lessons.find(doc => doc._id.equals(lesson._id));
						const above = lessons.filter(doc =>
							rankDown
								? doc.order > order && !doc._id.equals(lesson._id)
								: doc.order >= order && !doc._id.equals(lesson._id)
						);
						const orderedLessons = [...below, target!, ...above];

						const SAFE_OFFSET = 10000;
						const shifted = await LessonModel.updateMany(
							{ module: module._id },
							{ $inc: { order: SAFE_OFFSET } },
							{ session: dbSession },
						);

						if (shifted.modifiedCount !== lessons.length) {
							throw new AppError(
								`Shift mismatch: Expected ${lessons.length} but got ${shifted.modifiedCount}`,
								400,
							);
						}

						const operations = orderedLessons.map((doc, index) => {
							const update = { $set: { order: index + 1 } };
							if (doc._id.equals(lesson._id)) {
								Object.assign(update.$set, otherInfoToSave);
							}

							return {
								updateOne: { filter: { _id: doc._id }, update: update },
							};
						});

						const bulkResult = operations.length
							? await LessonModel.bulkWrite(operations, { session: dbSession, ordered: true })
							: { matchedCount: 0, modifiedCount: 0 };

						if (bulkResult.matchedCount !== operations.length) {
							throw new AppError(
								`Bulk mismatch: Expected ${operations.length} but got ${bulkResult.matchedCount}`,
								400,
							);
						}

						const updatedLessons = await LessonModel.find(
							{ module: module._id },
							{
								_id: 1,
								order: 1,
								title: 1,
								description: 1,
								createdAt: 1,
								updatedAt: 1,
								module: 1,
								videoUrl: 1,
								duration: 1,
							},
							{ session: dbSession },
						).sort({ order: 1 });

						newUpdatedLessons = updatedLessons;

						finalUpdatedLesson = updatedLessons.find(doc => doc._id.equals(lesson._id));

						const serialMaintained = updatedLessons.every((doc, i) => doc.order === i + 1);
						if (!serialMaintained) {
							throw new AppError("Arranging modules in order failed.", 400);
						}

						return {
							reordered: `${
								req.user!.id
							} - update lesson: ${bulkResult.matchedCount} - ${bulkResult.modifiedCount}.`,
						};
					});
					console.log(updateResult);
				}
				finally {
					await dbSession.endSession();
				}
			}
			else {
				// lesson.order = order;
				// if (title) lesson.title = title;
				// if (description) lesson.description = description;
				// if (videoUrl) lesson.videoUrl = videoUrl;
				// if (duration) lesson.duration = duration;
				// finalUpdatedLesson = await lesson.save();
			}
		}
		else {
			if (title) lesson.title = title;
			if (description) lesson.description = description;
			if (videoUrl) lesson.videoUrl = videoUrl;
			if (duration) lesson.duration = duration;
			finalUpdatedLesson = await lesson.save();

			const updatedLessons = await LessonModel.find(
				{ module: module._id },
				{
					_id: 1,
					order: 1,
					title: 1,
					description: 1,
					createdAt: 1,
					updatedAt: 1,
					module: 1,
					videoUrl: 1,
					duration: 1,
				},
			).sort({ order: 1 });

			newUpdatedLessons = updatedLessons;
		}
	}

	if (finalUpdatedLesson && newUpdatedLessons) {
		apiResponse(
			res,
			200,
			"Lesson successfully updated.",
			newUpdatedLessons.map((lesson) => ({
				_id: lesson._id,
				title: lesson.title,
				description: lesson.description,
				videoUrl: lesson.videoUrl,
				duration: lesson.duration,
				order: lesson.order,
				updated: lesson.updatedAt,
				course: {
					_id: course._id,
					title: course.title,
				},
				module: {
					_id: module._id,
					title: module.title,
				},
			})),
		);
	}
	else {
		apiResponse(res, 400, "Failed to update the lesson.");
	}
	return;
});

const deleteLessonHandler = asyncHandler(async (req: Request, res: Response) => {
	const { cid, mid, lid } = req.params as Record<string, string>;
	const courseId = String(cid);
	const moduleId = String(mid);
	const lessonId = String(lid);

	if (!Types.ObjectId.isValid(courseId) || !Types.ObjectId.isValid(moduleId) || !Types.ObjectId.isValid(lessonId)) {
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

	const module = await ModuleModel.findOne({
		_id: moduleId,
		course: course._id,
	});

	if (!module) {
		apiResponse(res, 404, "Unable to find the module.");
		return;
	}

	const lessons = await LessonModel.find({ module: module._id }).sort({ order: "asc", createdAt: 1 });
	const lesson = lessons.find(doc => doc._id.equals(lessonId));

	let newUpdatedLessons: typeof lessons | undefined;

	if (!lesson) {
		apiResponse(res, 404, "Unable to find the lesson.");
		return;
	}
	else if (lessons.length < 2 && course.status === "published") {
		apiResponse(
			res,
			400,
			"Failed to delete the lesson: This is the only lesson of the course. Consider deleting the module instead.",
		);
		return;
	}

	const dbSession = await startSession();

	try {
		const updateResult = await dbSession.withTransaction(async () => {
			await ProgressModel.deleteMany({ course: course._id, lesson: lesson._id }, { session: dbSession });
			await LessonModel.deleteOne({ _id: lesson._id }, { session: dbSession });

			const below = lessons.filter(doc => doc.order < lesson.order);
			const above = lessons.filter(doc => doc.order > lesson.order);
			let newOrder = below.length;

			const SAFE_OFFSET = 10000;
			const shifted = await LessonModel.updateMany(
				{ module: module._id },
				{ $inc: { order: SAFE_OFFSET } },
				{ session: dbSession },
			);

			if (shifted.modifiedCount !== lessons.length - 1) {
				throw new AppError(
					`Failed to delete the module: Shift mismatch: Expected ${lessons.length} but got ${shifted.modifiedCount}`,
					400,
				);
			}

			const operations = [
				...below.map((doc, index) => {
					if (index + 1 === below.length) newOrder = index + 1;

					return {
						updateOne: {
							filter: { _id: doc._id },
							update: { $set: { order: index + 1 } },
						},
					};
				}),
				...above.map((doc, index) => ({
					updateOne: {
						filter: { _id: doc._id },
						update: { $set: { order: index + 1 + newOrder } },
					},
				})),
			];

			const bulkResult = operations.length
				? await LessonModel.bulkWrite(operations, { session: dbSession, ordered: true })
				: { matchedCount: 0, modifiedCount: 0 };

			if (bulkResult.matchedCount !== operations.length) {
				throw new AppError(
					`Failed to delete the module: Bulk mismatch: Expected ${operations.length} but got ${bulkResult.matchedCount}`,
					400,
				);
			}

			const updatedLessons = await LessonModel.find(
				{ module: module._id },
				{
					_id: 1,
					order: 1,
					title: 1,
					description: 1,
					createdAt: 1,
					updatedAt: 1,
					module: 1,
					videoUrl: 1,
					duration: 1,
				},
				{ session: dbSession },
			).sort({ order: 1 });

			newUpdatedLessons = updatedLessons;

			const serialMaintained = updatedLessons.every((doc, i) => doc.order === i + 1);
			if (!serialMaintained) {
				throw new AppError("Failed to delete the module: Arranging modules in order failed.", 400);
			}

			return {
				reordered: `${req.user!.id} - delete lesson: ${bulkResult.matchedCount} - ${bulkResult.modifiedCount}.`,
			};
		});
		console.log(updateResult);
	}
	finally {
		await dbSession.endSession();
	}

	if (newUpdatedLessons) {
		apiResponse(
			res,
			201,
			"Lesson deleted successfully.",
			newUpdatedLessons.map((lesson) => ({
				_id: lesson._id,
				title: lesson.title,
				description: lesson.description,
				order: lesson.order,
				videoUrl: lesson.videoUrl,
				duration: lesson.duration,
				updated: lesson.updatedAt,
				module: {
					id: lesson.module,
					title: module.title,
				},
				course: {
					id: module.course,
					title: course.title,
				},
			})),
		);
	}
	else {
		apiResponse(res, 400, "Failed to delete the lesson.");
	}
	return;
});

export {
	deleteLessonHandler,
	getMyCourseModuleLessonsHandler,
	makeLessonHandler,
	markCompleteHandler,
	updateLessonHandler,
};
