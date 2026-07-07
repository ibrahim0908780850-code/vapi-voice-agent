import { Queue } from "bullmq";
import { redis } from "../../src/config/redis.js";


export const schedulerQueue = new Queue(
  "scheduler-jobs",
  {
    connection: redis
  }
);