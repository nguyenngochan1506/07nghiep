import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { ApplicantList, type ApplicantItem } from "@/components/applicant-list";
import { useEffect, useState } from "react";
import { env } from "@07nghiep/env/employer";
import { toast } from "sonner";
import { createSSEConnection } from "@07nghiep/ui/lib/sse";

export const Route = createFileRoute("/messages")({
  component: MessagesLayout,
});

function MessagesLayout() {
  const { data: sessionData } = authClient.useSession();
  const currentUserId = sessionData?.user?.id ?? "";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { conversationId?: string };
  const [search, setSearch] = useState("");

  const { data: applicantsData, isLoading } = useQuery(
    trpc.conversation.getApplicants.queryOptions(
      { limit: 50, search: search || undefined },
      { enabled: !!currentUserId }
    )
  );

  const startConversation = useMutation(
    trpc.conversation.start.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.conversation.getApplicants.queryKey() });
        navigate({
          to: "/messages/$conversationId",
          params: { conversationId: data.id },
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  useEffect(() => {
    if (!sessionData?.user) {
      navigate({ to: "/login" });
    }
  }, [sessionData, navigate]);

  useEffect(() => {
    if (!env.VITE_SERVER_URL) return;
    const abort = new AbortController();

    createSSEConnection(
      `${env.VITE_SERVER_URL}/api/notifications/sse`,
      (eventType) => {
        if (eventType === "notification") {
          queryClient.invalidateQueries({ queryKey: trpc.conversation.getApplicants.queryKey() });
          queryClient.invalidateQueries({ queryKey: trpc.conversation.getUnreadCount.queryKey() });
        }
      },
      abort.signal
    );

    return () => abort.abort();
  }, [queryClient]);

  const handleSelect = async (applicant: ApplicantItem) => {
    if (applicant.conversationId) {
      navigate({
        to: "/messages/$conversationId",
        params: { conversationId: applicant.conversationId },
      });
    } else {
      startConversation.mutate({
        candidateId: applicant.candidate.id,
        jobId: applicant.job.id,
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-0px)]">
      <div className="w-80 shrink-0 border-r bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Ứng viên</h2>
          <p className="text-xs text-muted-foreground">
            Nhắn tin trao đổi với ứng viên đã ứng tuyển
          </p>
        </div>
        <ApplicantList
          applicants={applicantsData?.items ?? []}
          currentUserId={currentUserId}
          activeConversationId={params.conversationId}
          isLoading={isLoading}
          onSelect={handleSelect}
          onSearch={setSearch}
        />
      </div>
      <div className="flex flex-1 flex-col bg-background">
        {params.conversationId ? (
          <Outlet />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mb-3 text-5xl">💬</div>
              <h3 className="text-lg font-medium">Tin nhắn</h3>
              <p className="text-sm text-muted-foreground">
                Chọn một ứng viên để bắt đầu trò chuyện
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
