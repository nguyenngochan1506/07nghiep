import { adminProcedure, router } from "../../lib/api";

type CountRow<Key extends string> = {
  [key: string]: Key | { id: number };
  _count: {
    id: number;
  };
};

function countBy<Key extends string>(rows: CountRow<Key>[], key: string) {
  return Object.fromEntries(rows.map((row) => [row[key] as Key, row._count.id])) as Record<
    Key,
    number | undefined
  >;
}

export const adminSummaryRouter = router({
  overview: adminProcedure.query(async ({ ctx }) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      userRoleRows,
      suspendedUsers,
      organizationRows,
      jobRows,
      applicationRows,
      businessApplicationRows,
      paymentRows,
      paidPayments,
      newUsersLast7Days,
      newJobsLast7Days,
      newApplicationsLast7Days,
      recentJobs,
      recentBusinessApplications,
    ] = await Promise.all([
      ctx.prisma.user.groupBy({
        by: ["role"],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      ctx.prisma.user.count({ where: { deletedAt: null, isSuspended: true } }),
      ctx.prisma.organization.groupBy({
        by: ["verificationStatus"],
        _count: { id: true },
      }),
      ctx.prisma.job.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      ctx.prisma.application.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      ctx.prisma.businessApplication.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      ctx.prisma.payment.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      ctx.prisma.payment.aggregate({
        where: { status: "PAID" },
        _count: { id: true },
        _sum: { amountVnd: true },
      }),
      ctx.prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
      }),
      ctx.prisma.job.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      ctx.prisma.application.count({
        where: { appliedAt: { gte: sevenDaysAgo } },
      }),
      ctx.prisma.job.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          organization: {
            select: {
              name: true,
            },
          },
        },
      }),
      ctx.prisma.businessApplication.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          companyName: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const users = countBy(userRoleRows, "role");
    const organizations = countBy(organizationRows, "verificationStatus");
    const jobs = countBy(jobRows, "status");
    const applications = countBy(applicationRows, "status");
    const businessApplications = countBy(businessApplicationRows, "status");
    const payments = countBy(paymentRows, "status");

    const candidateUsers = users.CANDIDATE ?? 0;
    const employerUsers = users.EMPLOYER ?? 0;
    const adminUsers = users.ADMIN ?? 0;
    const totalUsers = candidateUsers + employerUsers + adminUsers;

    return {
      users: {
        total: totalUsers,
        candidates: candidateUsers,
        employers: employerUsers,
        admins: adminUsers,
        suspended: suspendedUsers,
        newLast7Days: newUsersLast7Days,
      },
      organizations: {
        total:
          (organizations.UNVERIFIED ?? 0) +
          (organizations.PENDING ?? 0) +
          (organizations.VERIFIED ?? 0) +
          (organizations.REJECTED ?? 0),
        pending: organizations.PENDING ?? 0,
        verified: organizations.VERIFIED ?? 0,
        rejected: organizations.REJECTED ?? 0,
        unverified: organizations.UNVERIFIED ?? 0,
      },
      jobs: {
        total:
          (jobs.DRAFT ?? 0) +
          (jobs.PENDING_APPROVAL ?? 0) +
          (jobs.OPEN ?? 0) +
          (jobs.CLOSED ?? 0) +
          (jobs.ARCHIVED ?? 0),
        open: jobs.OPEN ?? 0,
        pendingApproval: jobs.PENDING_APPROVAL ?? 0,
        draft: jobs.DRAFT ?? 0,
        closed: jobs.CLOSED ?? 0,
        archived: jobs.ARCHIVED ?? 0,
        newLast7Days: newJobsLast7Days,
      },
      applications: {
        total:
          (applications.PENDING ?? 0) +
          (applications.VIEWED ?? 0) +
          (applications.SHORTLISTED ?? 0) +
          (applications.INTERVIEWING ?? 0) +
          (applications.OFFERED ?? 0) +
          (applications.REJECTED ?? 0) +
          (applications.WITHDRAWN ?? 0),
        pending: applications.PENDING ?? 0,
        interviewing: applications.INTERVIEWING ?? 0,
        offered: applications.OFFERED ?? 0,
        newLast7Days: newApplicationsLast7Days,
      },
      businessApplications: {
        pending: businessApplications.PENDING ?? 0,
        approved: businessApplications.APPROVED ?? 0,
        rejected: businessApplications.REJECTED ?? 0,
      },
      billing: {
        paidRevenueVnd: paidPayments._sum.amountVnd ?? 0,
        paidPayments: paidPayments._count.id,
        pendingPayments: payments.PENDING ?? 0,
        reviewRequired: payments.REVIEW_REQUIRED ?? 0,
        failedPayments: payments.FAILED ?? 0,
      },
      recent: {
        jobs: recentJobs,
        businessApplications: recentBusinessApplications,
      },
    };
  }),
});
