import { describe, expect, it } from "vitest";
import { shouldSendRenewalReminder } from "./reminders";

describe("shouldSendRenewalReminder", () => {
  it("sends when subscription expires within 3 days and no reminder was sent today", () => {
    expect(
      shouldSendRenewalReminder({
        now: new Date("2026-06-27T10:00:00.000Z"),
        currentPeriodEnd: new Date("2026-06-29T10:00:00.000Z"),
        lastRenewalReminderSentAt: null,
      }),
    ).toBe(true);
  });

  it("does not send twice on the same day", () => {
    expect(
      shouldSendRenewalReminder({
        now: new Date("2026-06-27T10:00:00.000Z"),
        currentPeriodEnd: new Date("2026-06-29T10:00:00.000Z"),
        lastRenewalReminderSentAt: new Date("2026-06-27T01:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("does not send after the subscription has expired", () => {
    expect(
      shouldSendRenewalReminder({
        now: new Date("2026-06-27T10:00:00.000Z"),
        currentPeriodEnd: new Date("2026-06-27T09:59:59.000Z"),
        lastRenewalReminderSentAt: null,
      }),
    ).toBe(false);
  });
});
