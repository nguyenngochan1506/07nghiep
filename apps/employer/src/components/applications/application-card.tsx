import { ApplicationStatus } from "@/types/application";
import { Avatar, AvatarFallback, AvatarImage } from "@07nghiep/ui/components/avatar";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent } from "@07nghiep/ui/components/card";
import { Link } from "@tanstack/react-router";
import { Calendar, User } from "lucide-react";
import { format } from "date-fns";

export const getStatusColor = (status: ApplicationStatus) => {
  switch (status) {
    case ApplicationStatus.PENDING:
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-500 dark:border-yellow-900";
    case ApplicationStatus.VIEWED:
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-500 dark:border-blue-900";
    case ApplicationStatus.SHORTLISTED:
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-500 dark:border-purple-900";
    case ApplicationStatus.INTERVIEWING:
      return "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-500 dark:border-indigo-900";
    case ApplicationStatus.OFFERED:
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-500 dark:border-green-900";
    case ApplicationStatus.REJECTED:
    case ApplicationStatus.WITHDRAWN:
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  }
};

export const getStatusLabel = (status: ApplicationStatus) => {
  switch (status) {
    case ApplicationStatus.PENDING:
      return "Pending";
    case ApplicationStatus.VIEWED:
      return "Viewed";
    case ApplicationStatus.SHORTLISTED:
      return "Shortlisted";
    case ApplicationStatus.INTERVIEWING:
      return "Interviewing";
    case ApplicationStatus.OFFERED:
      return "Offered";
    case ApplicationStatus.REJECTED:
      return "Rejected";
    case ApplicationStatus.WITHDRAWN:
      return "Withdrawn";
    default:
      return status;
  }
};

interface ApplicationCardProps {
  application: {
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
  };
  compact?: boolean;
}

export function ApplicationCard({ application, compact = false }: ApplicationCardProps) {
  const appliedDate =
    typeof application.appliedAt === "string"
      ? new Date(application.appliedAt)
      : application.appliedAt;

  return (
    <Card className="hover:border-primary/50 transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={application.candidate.image || undefined} />
              <AvatarFallback>
                <User className="h-4 w-4 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h4 className="font-medium text-sm truncate">
                {application.candidate.name || "Unknown Candidate"}
              </h4>
              {!compact && application.job && (
                <p className="text-xs text-muted-foreground truncate">{application.job.title}</p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                <span>{format(appliedDate, "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant="outline" className={getStatusColor(application.status)}>
              {getStatusLabel(application.status)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              asChild
            >
              <Link to="/applications/$applicationId" params={{ applicationId: application.id }}>
                View
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
