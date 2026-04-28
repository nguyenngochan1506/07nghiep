import { protectedProcedure, publicProcedure, router } from "../lib/api";

import { applicationRouter } from "./application";
import { organizationRouter } from "./organization";
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
});

export type AppRouter = typeof appRouter;
