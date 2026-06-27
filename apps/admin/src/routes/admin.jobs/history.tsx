import { createFileRoute } from "@tanstack/react-router";
import { ModerationHistory } from "../../components/admin/moderation-history";

export const Route = createFileRoute("/admin/jobs/history")({
  component: ModerationHistoryPage,
});

function ModerationHistoryPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Lịch sử kiểm duyệt</h2>
          <p className="text-sm text-muted-foreground">
            Xem lịch sử các quyết định kiểm duyệt
          </p>
        </div>
        <ModerationHistory limit={50} />
      </div>
    </div>
  );
}
