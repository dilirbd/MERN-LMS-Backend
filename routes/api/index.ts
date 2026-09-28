import express, { Router } from "express";
import authRoutes from "./auth.routes.ts";
import courseRoutes from "./course.routes.ts";
// import bannerRoute from './banner.ts';

const router: Router = express.Router();

// root/api/v1/auth
router.use("/auth", authRoutes);

router.use("/courses", courseRoutes);

// root/api/v1/banner
// router.use('/banner', bannerRoute);

export const apiRoutes = router;

// login, register, otp, fp, auth
