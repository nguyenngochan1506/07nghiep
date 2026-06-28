import type { ApplicationStatus } from "@/types/application";
import { Avatar, AvatarFallback, AvatarImage } from "@07nghiep/ui/components/avatar";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Checkbox } from "@07nghiep/ui/components/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@07nghiep/ui/components/table";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { User } from "lucide-react";
import { getAiScoreLabel, getStatusColor, getStatusLabel } from "./application-card";

interface ApplicationListProps {
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
    aiScore?: {
      status: string;
      score: number | null;
      recommendation: string | null;
    } | null;
  }>;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleAll: (selectAll: boolean) => void;
}

export function ApplicationList({
  applications,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: ApplicationListProps) {
  const allSelected = applications.length > 0 && selectedIds.length === applications.length;
  const _someSelected = selectedIds.length > 0 && selectedIds.length < applications.length;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => onToggleAll(checked === true)}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Candidate</TableHead>
            <TableHead>Job</TableHead>
            <TableHead>Applied Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>AI Fit</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No applications found.
              </TableCell>
            </TableRow>
          ) : (
            applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(app.id)}
                    onCheckedChange={() => onToggleSelect(app.id)}
                    aria-label={`Select ${app.candidate.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={app.candidate.image || undefined} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{app.candidate.name || "Unknown Candidate"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{app.job?.title || "N/A"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(app.appliedAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(app.status)}>
                    {getStatusLabel(app.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={app.aiScore?.status === "FAILED" ? "destructive" : "secondary"}>
                    {getAiScoreLabel(app.aiScore)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/applications/$applicationId" params={{ applicationId: app.id }}>
                      View Details
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
