import { Queue } from "bullmq";
import { redis } from "../config/redis.js";


export const exportQueue = new Queue(
  "export-jobs",
  {
    connection: redis
  }
);