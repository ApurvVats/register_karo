import mongoose from "mongoose";
import { config } from "../config";
import { logger } from "../utils/logger";

export async function connectDb(): Promise<void> {
  await mongoose.connect(config.mongo.uri, { serverSelectionTimeoutMS: 5000 });
  logger.info("MongoDB connected");
}

export async function closeDb(): Promise<void> {
  await mongoose.connection.close();
  logger.info("MongoDB connection closed");
}