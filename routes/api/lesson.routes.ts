import express, { Router } from "express";
import {
	deleteLessonHandler,
	getMyCourseModuleLessonsHandler,
	makeLessonHandler,
	markCompleteHandler,
	updateLessonHandler,
} from "../../controller/lesson.controller.ts";
import { authenticate } from "../../middleware/authenticator.middleware.ts";
import { authorize } from "./../../middleware/authorizer.middleware.ts";
import { dcRateLimit } from "../../middleware/rateLimiter.middleware.ts";
import { validate } from "../../middleware/validator.middleware.ts";
import { makeLessonSchema, updateLessonSchema } from "../../utils/validation/lesson.validation.ts";

const router: Router = express.Router({ mergeParams: true });

// root/api/v1/courses/:cid/modules/:mid/lessons

router.get(
	"/",
	authenticate,
	authorize("instructor", "student"),
	getMyCourseModuleLessonsHandler,
);

// sends response code 251 when unmarking a lesson as complete. And 200 when marking as complete.
router.post("/:lid/complete", dcRateLimit, authenticate, authorize("student"), markCompleteHandler);

router.post(
	"/new-lesson",
	dcRateLimit,
	authenticate,
	authorize("instructor"),
	validate(makeLessonSchema),
	makeLessonHandler,
);

router.patch(
	"/:lid/update-lesson",
	dcRateLimit,
	authenticate,
	authorize("instructor"),
	validate(updateLessonSchema),
	updateLessonHandler,
);

router.delete("/:lid/delete-lesson", dcRateLimit, authenticate, authorize("instructor"), deleteLessonHandler);

export default router;
