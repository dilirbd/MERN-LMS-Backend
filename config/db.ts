import mongoose from "mongoose";
import { config } from "../config/envConfig.ts";
import { syncModelIndices } from "../utils/syncModelIndices.ts";


const dbConfig = () => {
    mongoose.connect(config.dbUrl).then(async () => {
        console.log("Database connected!");
        await syncModelIndices();
    }).catch((err) => {
        console.log(err);
        console.log("Closing server.....");
        process.exit(1);
    });
};

export { dbConfig };