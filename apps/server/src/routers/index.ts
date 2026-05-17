import { protectedProcedure, publicProcedure, router } from "../lib/api";
import { applicationRouter } from "./application";
import { interviewRouter } from "./interview";

import { jobRouter } from "./job";
import { applicationsRouter } from "./applications";
import { organizationRouter } from "./organization";
import { notificationRouter } from "./notification";
import { profileRouter } from "./profile";
import { userRouter } from "./user";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  user: userRouter,
  profile: profileRouter,
  organization: organizationRouter,
  application: applicationRouter,
  job: jobRouter,
  notification: notificationRouter,
  applications: applicationsRouter,
  interview: interviewRouter,
});

export type AppRouter = typeof appRouter;
