import { protectedProcedure, publicProcedure, router } from "../lib/api";

import { jobRouter } from "./job";
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
  job: jobRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
