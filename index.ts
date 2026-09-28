import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import { dbConfig } from "./config/db.ts";
import { config } from "./config/envConfig.ts";
import { appRoutes } from "./routes/index.ts";
import globalErrorHandler from "./utils/globalErrorHandler.ts";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
	origin: config.furl,
	credentials: true,
	methods: ["GET", "POST", "PATCH", "DELETE"],
	allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(cookieParser());

app.use("/", appRoutes);
app.use(globalErrorHandler);

dbConfig();

app.listen(config.port, (config.nodeEnv === "dev") ? "localhost" : "0.0.0.0", async () => {
	console.log(`Server running on port ${config.port}...`);
});
