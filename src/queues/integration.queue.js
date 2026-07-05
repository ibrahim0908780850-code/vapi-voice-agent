import { Queue } from "bullmq";
import { redis } from "../config/redis.js";

export const integrationQueue = new Queue("integration-queue", {
  connection: redis
});