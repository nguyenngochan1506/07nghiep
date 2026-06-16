import { prisma } from "@07nghiep/db";
import { emitNotification } from "./src/lib/notifications/events";

async function run() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        title: "🔔 Thông báo hệ thống",
        body: `Đây là thông báo test cho ${user.email} vào lúc ${new Date().toLocaleTimeString()}`,
      },
    });

    emitNotification({
      ...notif,
      type: notif.type,
      createdAt: notif.createdAt.toISOString(),
    });
    console.log(`Đã gửi thông báo tới: ${user.email}`);
  }
}

run()
  .catch(console.error)
  .finally(() => process.exit(0));
