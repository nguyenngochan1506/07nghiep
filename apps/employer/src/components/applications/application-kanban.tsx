import { ApplicationStatus } from "@/types/application";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { ApplicationCard } from "./application-card";
import { trpc, queryClient } from "../../utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ScrollArea } from "@07nghiep/ui/components/scroll-area";

const KANBAN_COLUMNS = [
  { id: ApplicationStatus.PENDING, title: "Pending" },
  { id: ApplicationStatus.VIEWED, title: "Viewed" },
  { id: ApplicationStatus.SHORTLISTED, title: "Shortlisted" },
  { id: ApplicationStatus.INTERVIEW, title: "Interview" },
  { id: ApplicationStatus.OFFERED, title: "Offered" },
  { id: ApplicationStatus.REJECTED, title: "Rejected" },
];

interface ApplicationKanbanProps {
  applications: Array<{
    id: string;
    status: ApplicationStatus;
    appliedAt: Date | string;
    candidate: {
      name: string | null;
      image: string | null;
    };
    job?: {
      title: string;
    };
  }>;
}

export function ApplicationKanban({ applications }: ApplicationKanbanProps) {
  const updateStatusMutation = useMutation(
    trpc.application.updateStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Application status updated");
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to update status");
        queryClient.invalidateQueries();
      },
    })
  );

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as ApplicationStatus;
    const applicationId = draggableId;

    updateStatusMutation.mutate({
      id: applicationId,
      status: newStatus,
    });
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] overflow-x-auto pb-4">
      <DragDropContext onDragEnd={onDragEnd}>
        {KANBAN_COLUMNS.map((column) => {
          const columnApps = applications.filter((app) => app.status === column.id);

          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-[300px] flex flex-col bg-muted/40 rounded-xl border"
            >
              <div className="p-4 border-b bg-muted/50 rounded-t-xl flex items-center justify-between">
                <h3 className="font-semibold text-sm">{column.title}</h3>
                <span className="bg-background text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full border">
                  {columnApps.length}
                </span>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <ScrollArea className="flex-1">
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 flex flex-col gap-3 min-h-[150px] ${
                        snapshot.isDraggingOver ? "bg-muted/60" : ""
                      }`}
                    >
                      {columnApps.map((app, index) => (
                        <Draggable key={app.id} draggableId={app.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? "opacity-70" : ""}
                            >
                              <ApplicationCard application={app} compact />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </ScrollArea>
                )}
              </Droppable>
            </div>
          );
        })}
      </DragDropContext>
    </div>
  );
}
