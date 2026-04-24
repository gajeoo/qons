import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run scheduled automation checks every hour
crons.interval(
  "scheduled-automations",
  { hours: 1 },
  internal.automations.runScheduledChecks,
);

export default crons;
