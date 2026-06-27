import { createFileRoute } from "@tanstack/react-router";
import { PendingJobsList } from "../../components/admin/pending-jobs-list";

export const Route = createFileRoute("/admin/jobs/pending")({
  component: PendingJobsPage,
});

function PendingJobsPage() {
  return (
    <div className="container mx-auto py-6">
      <PendingJobsList />
    </div>
  );
}
