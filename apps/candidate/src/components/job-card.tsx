import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  DollarSign,
  Heart,
  MapPin,
} from "lucide-react";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@07nghiep/ui/components/card";

export interface Job {
  id: string;
  title: string;
  companyName: string;
  companyLogo: string;
  isVerified: boolean;
  location: string;
  workType: string;
  jobType: string;
  salaryRange: string;
  skills: string[];
  postedDate: string;
  isSaved?: boolean;
}

interface JobCardProps {
  job: Job;
  onSave?: (id: string) => void;
}

export function JobCardItem({ job, onSave }: JobCardProps) {
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
              {job.companyLogo ? (
                <img
                  src={job.companyLogo}
                  alt={`${job.companyName} logo`}
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <Building2 className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                <Link
                  to={`/jobs/$jobId`}
                  params={{ jobId: job.id }}
                  className="text-foreground transition-colors hover:text-primary"
                >
                  {job.title}
                </Link>
              </CardTitle>
              <p className="mt-1 flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                <span className="truncate">{job.companyName}</span>
                {job.isVerified ? <CheckCircle2 className="size-4 text-primary" /> : null}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onSave?.(job.id);
            }}
            variant="ghost"
            size="icon-sm"
            aria-label={job.isSaved ? "Bỏ lưu việc làm" : "Lưu việc làm"}
          >
            <Heart className={job.isSaved ? "size-4 fill-current text-destructive" : "size-4"} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">
            <MapPin data-icon="inline-start" />
            {job.location}
          </Badge>
          <Badge variant="secondary">
            <BriefcaseBusiness data-icon="inline-start" />
            {job.workType}
          </Badge>
          <Badge variant="secondary">
            <Clock3 data-icon="inline-start" />
            {job.jobType}
          </Badge>
          <Badge variant="outline">
            <DollarSign data-icon="inline-start" />
            {job.salaryRange}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {job.skills.map((skill) => (
            <Badge key={skill} variant="outline">
              {skill}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter>
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">Đăng: {job.postedDate}</div>
          <Button asChild variant="outline" size="sm">
            <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
              Chi tiết
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
