import { Link } from '@tanstack/react-router';
import {
    MapPin,
    Building2,
    Clock,
    Banknote,
    Heart,
    BadgeCheck,
    Calendar,
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardAction,
} from '@07nghiep/ui/components/card';
import { Badge } from '@07nghiep/ui/components/badge';
import { Button } from '@07nghiep/ui/components/button';
import {
    Avatar,
    AvatarImage,
    AvatarFallback,
} from '@07nghiep/ui/components/avatar';

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
    const companyInitials = job.companyName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <Card className="group/job-card transition-shadow duration-200 hover:shadow-md">
            <CardHeader>
                {/* Top row: logo + title + company */}
                <div className="flex items-start gap-3">
                    <Avatar size="lg">
                        {job.companyLogo ? (
                            <AvatarImage
                                src={job.companyLogo}
                                alt={job.companyName}
                            />
                        ) : null}
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
                            {companyInitials}
                        </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 space-y-0.5">
                        <Link
                            to={`/jobs/$jobId`}
                            params={{ jobId: job.id }}
                            className="text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary line-clamp-1"
                        >
                            {job.title}
                        </Link>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="truncate">{job.companyName}</span>
                            {job.isVerified && (
                                <BadgeCheck className="size-3.5 shrink-0 text-primary" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Save button (top-right via CardAction) */}
                <CardAction>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                            e.preventDefault();
                            onSave?.(job.id);
                        }}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={job.isSaved ? 'Bỏ lưu' : 'Lưu việc làm'}
                    >
                        <Heart
                            className={`size-4 transition-all ${
                                job.isSaved
                                    ? 'fill-destructive text-destructive scale-110'
                                    : 'fill-none'
                            }`}
                        />
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Meta info row */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="gap-1">
                        <MapPin className="size-3" />
                        {job.location}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                        <Building2 className="size-3" />
                        {job.workType}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                        <Clock className="size-3" />
                        {job.jobType}
                    </Badge>
                    <Badge
                        variant="outline"
                        className="gap-1 border-success/30 bg-success/5 text-success"
                    >
                        <Banknote className="size-3" />
                        {job.salaryRange}
                    </Badge>
                </div>

                {/* Skills */}
                {job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {job.skills.map((skill) => (
                            <Badge
                                key={skill}
                                variant="outline"
                                className="border-primary/20 bg-primary/5 text-primary font-normal"
                            >
                                {skill}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Posted date */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <Calendar className="size-3" />
                    <span>Đăng: {job.postedDate}</span>
                </div>
            </CardContent>
        </Card>
    );
}