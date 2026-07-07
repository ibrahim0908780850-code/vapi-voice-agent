import { Queue } from "bullmq";
import { redis } from "../config/redis.js";


export const schedulerQueue = new Queue(
  "scheduler-jobs",
  {
    connection: redis
  }
);