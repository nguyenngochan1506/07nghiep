import { protectedProcedure, publicProcedure, router } from "../lib/api";
import { applicationRouter } from "./application";
import { interviewRouter } from "./interview";

import { jobRouter } from "./job";
import { applicationsRouter } from "./applications";
import { adminJobRouter } from "./admin/job";
import { adminOrganizationRouter } from "./admin/organization";
import { adminUserRouter } from "./admin/user";
import { adminBillingRouter } from "./admin/billing";
import { adminBusinessApplicationRouter } from "./admin/businessApplication";
import { organizationRouter } from "./organization";
import { notificationRouter } from "./notification";
import { profileRouter } from "./profile";
import { userRouter } from "./user";
import { conversationRouter } from "./conversation";
import { messageRouter } from "./message";
import { savedJobRouter } from "./savedJob";
import { billingRouter } from "./billing";
import { businessApplicationRouter } from "./businessApplication";

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
  billing: billingRouter,
  businessApplication: businessApplicationRouter,
  admin: router({
    users: adminUserRouter,
    organizations: adminOrganizationRouter,
    jobs: adminJobRouter,
    billing: adminBillingRouter,
    businessApplications: adminBusinessApplicationRouter,
  }),
  interview: interviewRouter,
  conversation: conversationRouter,
  message: messageRouter,
  savedJob: savedJobRouter,
});

export type AppRouter = typeof appRouter;
