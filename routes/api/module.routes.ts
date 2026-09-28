import express, { Router } from "express";
import {
	deleteModuleHandler,
	getMyCourseModulesHandler,
	makeModuleHandler,
	updateModuleHandler,
} from "../../controller/module.controller.ts";
import { authenticate } from "../../middleware/authenticator.middleware.ts";
import { authorize } from "./../../middleware/authorizer.middleware";
import { dcRateLimit } from "../../middleware/rateLimiter.middleware.ts";
import { validate } from "../../middleware/validator.middleware.ts";
import { makeModuleSchema, updateModuleSchema } from "../../utils/validation/module.validation.ts";
import lessonRoutes from "./lesson.routes.ts";

// parent params get stripped otherwise
const router: Router = express.Router({ mergeParams: true });

// root/api/v1/courses/:cid/modules

router.use("/:mid/lessons", lessonRoutes);

router.get("/", authenticate, authorize("instructor", "student"), getMyCourseModulesHandler);

router.post(
	"/new-module",
	dcRateLimit,
	authenticate,
	authorize("instructor"),
	validate(makeModuleSchema),
	makeModuleHandler,
);

router.patch(
	"/:id/update-module",
	dcRateLimit,
	authenticate,
	authorize("instructor"),
	validate(updateModuleSchema),
	updateModuleHandler,
);

router.delete("/:id/delete-module", dcRateLimit, authenticate, authorize("instructor"), deleteModuleHandler);

export default router;
