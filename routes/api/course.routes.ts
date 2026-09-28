import express, { Router } from "express";
import {
	courseEnrollHandler,
	deleteCourseHandler,
	getMyCourseHandler,
	getMyCoursesHandler,
	getPublicCourseHandler,
	getPublicCoursesHandler,
	makeCourseHandler,
	publishCourseHandler,
	updateCourseHandler,
} from "../../controller/course.controller.ts";
import { authenticate, optionalAuthenticate } from "../../middleware/authenticator.middleware.ts";
import { authorize } from "./../../middleware/authorizer.middleware";
import { dcRateLimit } from "../../middleware/rateLimiter.middleware.ts";
import { validate, validateQuery } from "../../middleware/validator.middleware.ts";
import {
	getCoursesQuerySchema,
	getMyCoursesQuerySchema,
	makeCourseSchema,
	updateCourseSchema,
} from "../../utils/validation/course.validation.ts";
import moduleRoutes from "./module.routes.ts";

const router: Router = express.Router();

// root/api/v1/courses

router.use("/:cid/modules", moduleRoutes);

router.post("/:id/enroll", dcRateLimit, authenticate, authorize("student"), courseEnrollHandler);
router.post("/:id/unenroll", dcRateLimit, authenticate, authorize("student"), courseEnrollHandler);

// accepts query parameters
router.get(
	"/my-courses",
	authenticate,
	authorize("instructor", "student"),
	validateQuery(getMyCoursesQuerySchema),
	getMyCoursesHandler,
);
router.get("/my-courses/:id", authenticate, authorize("instructor", "student"), getMyCourseHandler);

router.post(
	"/my-courses/new-course",
	dcRateLimit,
	authenticate,
	authorize("instructor"),
	validate(makeCourseSchema),
	makeCourseHandler,
);
router.patch(
	"/my-courses/:id/update-course",
	dcRateLimit,
	authenticate,
	authorize("instructor"),
	validate(updateCourseSchema),
	updateCourseHandler,
);
router.patch("/my-courses/:id/publish", dcRateLimit, authenticate, authorize("instructor"), publishCourseHandler);
router.delete("/my-courses/:id/delete-course", dcRateLimit, authenticate, authorize("instructor"), deleteCourseHandler);

// accepts query parameters
router.get("/", validateQuery(getCoursesQuerySchema), getPublicCoursesHandler);
router.get("/:id", optionalAuthenticate, getPublicCourseHandler);

export default router;
