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
                aria-label="Chọn tất cả"
              />
            </TableHead>
            <TableHead>Ứng viên</TableHead>
            <TableHead>Tin tuyển dụng</TableHead>
            <TableHead>Ngày ứng tuyển</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>AI chấm điểm</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Chưa có hồ sơ ứng tuyển phù hợp.
              </TableCell>
            </TableRow>
          ) : (
            applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(app.id)}
                    onCheckedChange={() => onToggleSelect(app.id)}
                    aria-label={`Chọn ${app.candidate.name ?? "ứng viên"}`}
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
                    <span className="font-medium">{app.candidate.name || "Ứng viên chưa rõ"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {app.job?.title || "Chưa có dữ liệu"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(app.appliedAt).toLocaleDateString("vi-VN")}
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
                      Xem chi tiết
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
