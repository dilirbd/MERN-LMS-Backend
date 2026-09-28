import express, { Router } from "express";
import "dotenv/config";
import { config } from "../config/envConfig.ts";
import { apiRoutes } from "./api/index.ts";

const router: Router = express.Router();

// root/api/v1
router.use(config.baseUrl, apiRoutes);

// router.get('/', (req, res) => {
//     res.send("Hello World");
// })

export const appRoutes = router;
