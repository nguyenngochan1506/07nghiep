import type { PrismaClient } from "@07nghiep/db";
import { sendRenewalReminderEmail } from "./email";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function shouldSendRenewalReminder({
  now,
  currentPeriodEnd,
  lastRenewalReminderSentAt,
}: {
  now: Date;
  currentPeriodEnd: Date;
  lastRenewalReminderSentAt: Date | null;
}) {
  const msUntilExpiry = currentPeriodEnd.getTime() - now.getTime();
  const expiresSoon = msUntilExpiry > 0 && msUntilExpiry <= 3 * DAY_MS;
  const alreadySentToday =
    lastRenewalReminderSentAt &&
    startOfDay(lastRenewalReminderSentAt).getTime() === startOfDay(now).getTime();

  return expiresSoon && !alreadySentToday;
}

export async function sendRenewalReminders({
  prisma,
  now = new Date(),
}: {
  prisma: PrismaClient;
  now?: Date;
}) {
  const candidates = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: {
        gt: now,
        lte: new Date(now.getTime() + 3 * DAY_MS),
      },
    },
    include: {
      user: { select: { email: true, name: true } },
      plan: { select: { name: true } },
    },
  });

  let sent = 0;

  for (const subscription of candidates) {
    if (
      !shouldSendRenewalReminder({
        now,
        currentPeriodEnd: subscription.currentPeriodEnd,
        lastRenewalReminderSentAt: subscription.lastRenewalReminderSentAt,
      })
    ) {
      continue;
    }

    await sendRenewalReminderEmail({
      to: subscription.user.email,
      name: subscription.user.name,
      planName: subscription.plan.name,
      expiresAt: subscription.currentPeriodEnd,
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { lastRenewalReminderSentAt: now },
    });

    sent += 1;
  }

  return { sent };
}
