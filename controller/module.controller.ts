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

const getMyCourseModulesHandler = asyncHandler(async (req: Request, res: Response) => {
	const { cid } = req.params as Record<string, string>;
	const courseId = String(cid);

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

		const modules = await ModuleModel.find({ course: course._id }).sort({ order: "asc" });

		if (!modules.length) {
			apiResponse(res, 404, "No modules found.");
			return;
		}

		const data = modules.map((module) => ({
			_id: module._id,
			course: course.title,
			title: module.title,
			description: module.description,
			order: module.order,
			added: module.createdAt,
			updated: module.updatedAt,
		}));

		apiResponse(res, 200, "Found the course modules.", data);
	}
	else if (req.user!.role === "student") {
		const enrolled = await EnrollmentModel.findOne({ student: req.user!.id, course: courseId })
			.populate<
				{
					course: {
						_id: Types.ObjectId;
						status: string;
					};
				}
			>({
				path: "course",
				match: { status: "published" },
				select: "_id status",
			});

		if (!(enrolled && enrolled.course)) {
			apiResponse(res, 400, "Unable to find the course.");
			return;
		}

		const modules = await ModuleModel.find({ course: enrolled.course._id }).sort({ order: "asc" });

		if (!modules.length) {
			apiResponse(res, 404, "No modules found.");
			return;
		}

		const data = modules.map((module) => ({
			_id: module._id,
			title: module.title,
			description: module.description,
			added:
				`${module.createdAt.getUTCDate()}/${module.createdAt.getUTCMonth()}/${module.createdAt.getUTCFullYear()}`,
			updated:
				`${module.updatedAt.getUTCDate()}/${module.updatedAt.getUTCMonth()}/${module.updatedAt.getUTCFullYear()}`,
		}));

		apiResponse(res, 200, "Found the course modules.", data);
	}
	else {
		apiResponse(res, 400, "Hello admin.");
	}

	return;
});

const makeModuleHandler = asyncHandler(async (req: Request, res: Response) => {
	const { cid } = req.params as Record<string, string>;
	const courseId = String(cid);
	const { title: iTitle, description: iDescription, order: iOrder } = req.body as {
		title: string;
		description?: string;
		order: number;
	};

	const title = String(iTitle.trim());
	const description = iDescription ? String(iDescription.trim()) : iDescription;
	const order = Number(iOrder);

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

	const modules = await ModuleModel.find({ course: course._id }).sort({ order: "asc", createdAt: 1 });

	if (modules.length === 150) {
		apiResponse(res, 400, "Cannot add more than 150 modules in one course.");
		return;
	}

	let finalInsertedModule: typeof modules[number] | undefined;

	let newModulesList: typeof modules | undefined;

	const dbSession = await startSession();

	try {
		const updateResult = await dbSession.withTransaction(async () => {
			const otherInfoToSave = {
				...{ title },
				...(description && { description }),
			};

			const below = modules.filter(doc => doc.order < order);
			const above = modules.filter(doc => doc.order >= order);
			let newOrder = below.length + 1;

			const SAFE_OFFSET = 10000;
			const shifted = await ModuleModel.updateMany(
				{ course: course._id },
				{ $inc: { order: SAFE_OFFSET } },
				{ session: dbSession },
			);

			if (shifted.modifiedCount !== modules.length) {
				throw new AppError(
					`Shift mismatch: Expected ${modules.length} but got ${shifted.modifiedCount}`,
					400,
				);
			}

			const operations = [
				...below.map((doc, index) => {
					if (index + 1 === below.length) newOrder = index + 2;

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
				? await ModuleModel.bulkWrite(operations, { session: dbSession, ordered: true })
				: { matchedCount: 0, modifiedCount: 0 };

			if (bulkResult.matchedCount !== operations.length) {
				throw new AppError(
					`Bulk mismatch: Expected ${operations.length} but got ${bulkResult.matchedCount}`,
					400,
				);
			}

			[finalInsertedModule] = await ModuleModel.create([{
				course: course._id,
				...otherInfoToSave,
				order: newOrder,
			}], { session: dbSession });

			const updatedModules = await ModuleModel.find(
				{ course: course._id },
				{ _id: 1, order: 1, title: 1, description: 1, createdAt: 1, updatedAt: 1, course: 1 },
				{ session: dbSession },
			).sort({ order: 1 });

			newModulesList = updatedModules;

			const serialMaintained = updatedModules.every((doc, i) => doc.order === i + 1);
			if (!serialMaintained) {
				throw new AppError("Arranging modules in order failed.", 400);
			}

			return {
				reordered: `${req.user!.id} - add module: ${bulkResult.matchedCount} - ${bulkResult.modifiedCount}.`,
			};
		});
		console.log(updateResult);
	}
	finally {
		await dbSession.endSession();
	}

	if (finalInsertedModule && newModulesList) {
		apiResponse(
			res,
			201,
			"Module added successfully.",
			newModulesList.map((module) => ({
				_id: module._id,
				title: module.title,
				description: module.description,
				order: module.order,
				updated: module.updatedAt,
				course: {
					_id: module.course,
					title: course.title,
				},
			})),
		);
	}
	else {
		apiResponse(res, 400, "Failed to add the module.");
	}
	return;
});

const updateModuleHandler = asyncHandler(async (req: Request, res: Response) => {
	const { cid, id } = req.params as Record<string, string>;
	const courseId = String(cid);
	const moduleId = String(id);
	const { title: iTitle, description: iDescription, order: iOrder } = req.body as {
		title?: string;
		description?: string;
		order?: number;
	};

	const title = iTitle ? String(iTitle.trim()) : iTitle;
	const description = iDescription ? String(iDescription.trim()) : iDescription;
	const order = iOrder ? Number(iOrder) : iOrder;

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

	const modules = await ModuleModel.find({ course: course._id }).sort({ order: "asc", createdAt: "asc" });
	const module = modules.find(doc => doc._id.equals(moduleId));

	if (!module) {
		apiResponse(res, 404, "Unable to find the module.");
		return;
	}

	const collidingModule = modules.find(doc => doc.order === order);

	let finalUpdatedModule: typeof module | undefined;

	let newModulesList: typeof modules | undefined;

	if (order !== module.order || title !== module.title || description !== module.description) {
		if (order && order !== module.order) {
			// put collidingModule here if you want to re-order only when collision occurs and un-comment the else block
			if (true) {
				const dbSession = await startSession();

				try {
					const updateResult = await dbSession.withTransaction(async () => {
						const otherInfoToSave = {
							...(title && { title }),
							...(description && { description }),
						};

						const rankDown = order > module.order;

						const below = modules.filter(doc =>
							rankDown
								? doc.order <= order && !doc._id.equals(module._id)
								: doc.order < order && !doc._id.equals(module._id)
						);
						const target = modules.find(doc => doc._id.equals(module._id));
						const above = modules.filter(doc =>
							rankDown
								? doc.order > order && !doc._id.equals(module._id)
								: doc.order >= order && !doc._id.equals(module._id)
						);
						const orderedModules = [...below, target!, ...above];

						const SAFE_OFFSET = 10000;
						const shifted = await ModuleModel.updateMany(
							{ course: course._id },
							{ $inc: { order: SAFE_OFFSET } },
							{ session: dbSession },
						);

						if (shifted.modifiedCount !== modules.length) {
							throw new AppError(
								`Shift mismatch: Expected ${modules.length} but got ${shifted.modifiedCount}`,
								400,
							);
						}

						const operations = orderedModules.map((doc, index) => {
							const update = { $set: { order: index + 1 } };
							if (doc._id.equals(module._id)) {
								Object.assign(update.$set, otherInfoToSave);
							}

							return {
								updateOne: { filter: { _id: doc._id }, update: update },
							};
						});

						const bulkResult = operations.length
							? await ModuleModel.bulkWrite(operations, { session: dbSession, ordered: true })
							: { matchedCount: 0, modifiedCount: 0 };

						if (bulkResult.matchedCount !== operations.length) {
							throw new AppError(
								`Bulk mismatch: Expected ${operations.length} but got ${bulkResult.matchedCount}`,
								400,
							);
						}

						const updatedModules = await ModuleModel.find(
							{ course: course._id },
							{ _id: 1, order: 1, title: 1, description: 1, createdAt: 1, updatedAt: 1, course: 1 },
							{ session: dbSession },
						).sort({ order: 1 });

						newModulesList = updatedModules;

						finalUpdatedModule = updatedModules.find(doc => doc._id.equals(module._id));

						const serialMaintained = updatedModules.every((doc, i) => doc.order === i + 1);
						if (!serialMaintained) {
							throw new AppError("Arranging modules in order failed.", 400);
						}

						return {
							reordered: `${
								req.user!.id
							} - update module: ${bulkResult.matchedCount} - ${bulkResult.modifiedCount}.`,
						};
					});
					console.log(updateResult);
				}
				finally {
					await dbSession.endSession();
				}
			}
			else {
				// module.order = order;
				// if (title) module.title = title;
				// if (description) module.description = description;
				// finalUpdatedModule = await module.save();
			}
		}
		else {
			if (title) module.title = title;
			if (description) module.description = description;
			finalUpdatedModule = await module.save();
			const updatedModules = await ModuleModel.find(
				{ course: course._id },
				{ _id: 1, order: 1, title: 1, description: 1, createdAt: 1, updatedAt: 1, course: 1 },
			).sort({ order: 1 });

			newModulesList = updatedModules;
		}
	}

	if (finalUpdatedModule && newModulesList) {
		apiResponse(
			res,
			200,
			"Module successfully updated.",
			newModulesList.map((module) => ({
				_id: module._id,
				title: module.title,
				description: module.description,
				order: module.order,
				updated: module.updatedAt,
				course: {
					_id: module.course,
					title: course.title,
				},
			})),
		);
	}
	else {
		apiResponse(res, 400, "Failed to update the module.");
	}
	return;
});

const deleteModuleHandler = asyncHandler(async (req: Request, res: Response) => {
	const { cid, id } = req.params as Record<string, string>;
	const courseId = String(cid);
	const moduleId = String(id);

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

	const modules = await ModuleModel.find({ course: course._id }).sort({ order: "asc", createdAt: 1 });

	const module = modules.find(doc => doc._id.equals(moduleId));

	if (!module) {
		apiResponse(res, 404, "Unable to find the module.");
		return;
	}
	else if (modules.length < 2 && course.status === "published") {
		apiResponse(
			res,
			400,
			"Failed to delete the module: This is the only module of the course. Consider deleting the course instead.",
		);
		return;
	}

	let newModulesList: typeof modules | undefined;

	const dbSession = await startSession();

	try {
		const updateResult = await dbSession.withTransaction(async () => {
			const lessonIds = await LessonModel.find({ module: module._id }).distinct("_id").session(dbSession);
			await ProgressModel.deleteMany({ course: course._id, lesson: { $in: lessonIds } }, { session: dbSession });
			await LessonModel.deleteMany({ module: module._id }, { session: dbSession });
			await ModuleModel.deleteOne({ _id: module._id }, { session: dbSession });

			const below = modules.filter(doc => doc.order < module.order);
			const above = modules.filter(doc => doc.order > module.order);
			let newOrder = below.length;

			const SAFE_OFFSET = 10000;
			const shifted = await ModuleModel.updateMany(
				{ course: course._id },
				{ $inc: { order: SAFE_OFFSET } },
				{ session: dbSession },
			);

			if (shifted.modifiedCount !== modules.length - 1) {
				throw new AppError(
					`Failed to delete the module: Shift mismatch: Expected ${modules.length} but got ${shifted.modifiedCount}`,
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
				? await ModuleModel.bulkWrite(operations, { session: dbSession, ordered: true })
				: { matchedCount: 0, modifiedCount: 0 };

			if (bulkResult.matchedCount !== operations.length) {
				throw new AppError(
					`Failed to delete the module: Bulk mismatch: Expected ${operations.length} but got ${bulkResult.matchedCount}`,
					400,
				);
			}

			const updatedModules = await ModuleModel.find(
				{ course: course._id },
				{ _id: 1, order: 1, title: 1, description: 1, createdAt: 1, updatedAt: 1, course: 1 },
				{ session: dbSession },
			).sort({ order: 1 });

			newModulesList = updatedModules;

			const serialMaintained = updatedModules.every((doc, i) => doc.order === i + 1);
			if (!serialMaintained) {
				throw new AppError("Failed to delete the module: Arranging modules in order failed.", 400);
			}

			return {
				reordered: `${req.user!.id} - delete module: ${bulkResult.matchedCount} - ${bulkResult.modifiedCount}.`,
			};
		});
		console.log(updateResult);
	}
	finally {
		await dbSession.endSession();
	}

	if (newModulesList) {
		apiResponse(
			res,
			201,
			"Module deleted successfully.",
			newModulesList.map((module) => ({
				_id: module._id,
				title: module.title,
				description: module.description,
				order: module.order,
				updated: module.updatedAt,
				course: {
					_id: module.course,
					title: course.title,
				},
			})),
		);
	}
	else {
		apiResponse(res, 400, "Failed to delete the module.");
	}
	return;
});

export { deleteModuleHandler, getMyCourseModulesHandler, makeModuleHandler, updateModuleHandler };
