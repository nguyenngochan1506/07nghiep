import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
	ArrowRight,
	Building2,
	CalendarDays,
	BriefcaseBusiness,
	Loader2,
	Search,
	ChevronsUpDown,
	SearchX,
} from "lucide-react";

import { Badge } from "@07nghiep/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { Input } from "@07nghiep/ui/components/input";
import { Button } from "@07nghiep/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@07nghiep/ui/components/select";

import { trpc } from "@/utils/trpc";
import { ApplicationCard } from "@/components/application/application-card";

export const Route = createFileRoute("/applications/")({
	component: ApplicationsPage,
});

function ApplicationsPage() {
	// Controlled UI state
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<
		| "ALL"
		| "PENDING"
		| "VIEWED"
		| "SHORTLISTED"
		| "INTERVIEW"
		| "OFFERED"
		| "REJECTED"
		| "WITHDRAWN"
	>("ALL");
	const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

	// Debounce searchTerm -> debouncedSearchTerm
	useEffect(() => {
		const id = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 300);
		return () => clearTimeout(id);
	}, [searchTerm]);

	// Use trpc queryOptions with useQuery so TanStack Query auto-refetches when inputs change
	const { data, isLoading, isFetching } = useQuery(
		trpc.applications.list.queryOptions({
			search: debouncedSearchTerm || undefined,
			status: statusFilter === "ALL" ? undefined : (statusFilter as any),
			sortBy: sortBy,
		}),
	);

	const applications = useMemo(() => (data ?? []) as any[], [data]);

	return (
		<div className="min-h-screen bg-background">
			<section className="border-b border-border bg-secondary/20">
				<div className="container mx-auto max-w-7xl px-4 py-10 md:px-6">
					<div className="flex flex-col gap-4">
						<div className="space-y-2">
							<p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
								<BriefcaseBusiness className="h-4 w-4" />
								Hồ sơ ứng tuyển
							</p>
							<h1 className="text-3xl font-bold tracking-tight md:text-4xl">
								Danh sách đơn ứng tuyển
							</h1>
							<p className="max-w-2xl text-sm text-muted-foreground md:text-base">
								Theo dõi toàn bộ đơn bạn đã gửi, xem trạng thái xử lý và mở chi tiết khi cần chỉnh sửa.
							</p>
						</div>

						<div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
							{isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
							<span>{applications.length} đơn ứng tuyển</span>
						</div>
					</div>
				</div>
			</section>

			<main className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
				{/* Search, Filter, Sort Bar */}
				{!isLoading && applications.length > 0 && (
					<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
						<div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
							<Search className="h-4 w-4 text-muted-foreground shrink-0" />
							<Input
								type="text"
								placeholder="Tìm theo tên công việc hoặc công ty..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="border-0 bg-transparent p-0 placeholder:text-muted-foreground focus-visible:ring-0"
							/>
						</div>

						<div className="flex items-center gap-2">
							<Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "ALL")}>
								<SelectTrigger className="w-40">
									<SelectValue placeholder="Lọc theo trạng thái" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">Tất cả trạng thái</SelectItem>
									<SelectItem value="PENDING">Chờ duyệt</SelectItem>
									<SelectItem value="VIEWED">Đã xem</SelectItem>
									<SelectItem value="SHORTLISTED">Vào shortlist</SelectItem>
									<SelectItem value="INTERVIEW">Phỏng vấn</SelectItem>
									<SelectItem value="OFFERED">Đề nghị</SelectItem>
									<SelectItem value="REJECTED">Từ chối</SelectItem>
									<SelectItem value="WITHDRAWN">Đã rút</SelectItem>
								</SelectContent>
							</Select>

							<Button
								variant="outline"
								size="sm"
								onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
								title={`Sắp xếp: ${sortBy === "newest" ? "Mới nhất" : "Cũ nhất"}`}
								className="gap-2"
							>
								<ChevronsUpDown className="h-4 w-4" />
								<span className="hidden sm:inline text-sm">
									{sortBy === "newest" ? "Mới nhất" : "Cũ nhất"}
								</span>
							</Button>
						</div>
					</div>
				)}
				{isLoading ? (
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{Array.from({ length: 6 }).map((_, index) => (
							<Card key={index} className="p-0">
								<CardHeader className="space-y-3 border-b pb-4">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-6 w-4/5" />
									<Skeleton className="h-4 w-2/3" />
								</CardHeader>
								<CardContent className="space-y-3 pt-4">
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-8 w-28 rounded-full" />
								</CardContent>
							</Card>
						))}
					</div>
				) : applications.length === 0 ? (
					// Distinguish between 'no applications at all' and 'no search results'
					((searchTerm && searchTerm.trim() !== "") || statusFilter !== "ALL") ? (
						<div className="flex min-h-96 items-center justify-center">
							<Card className="w-full max-w-xl border-dashed bg-card/70 p-0 text-center">
								<CardContent className="flex flex-col items-center gap-4 px-8 py-16">
									<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
										<SearchX className="h-8 w-8" />
									</div>
									<div className="space-y-2">
										<h2 className="text-2xl font-semibold">Không tìm thấy kết quả</h2>
										<p className="text-sm text-muted-foreground">
											Không có đơn ứng tuyển phù hợp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại.
										</p>
									</div>
									<div className="flex gap-2">
										<Button
											onClick={() => {
												setSearchTerm("");
												setDebouncedSearchTerm("");
												setStatusFilter("ALL");
												setSortBy("newest");
											}}
										>
											Quay lại tất cả đơn
										</Button>
									</div>
								</CardContent>
							</Card>
						</div>
					) : (
						<div className="flex min-h-96 items-center justify-center">
							<Card className="w-full max-w-xl border-dashed bg-card/70 p-0 text-center">
								<CardContent className="flex flex-col items-center gap-4 px-8 py-16">
									<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
										<BriefcaseBusiness className="h-8 w-8" />
									</div>
									<div className="space-y-2">
										<h2 className="text-2xl font-semibold">Bạn chưa có đơn ứng tuyển nào</h2>
										<p className="text-sm text-muted-foreground">
											Hãy tìm một công việc phù hợp và gửi đơn ứng tuyển đầu tiên của bạn.
										</p>
									</div>
									<Link
										to="/jobs"
										className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
									>
										Tìm việc ngay
										<ArrowRight className="h-4 w-4" />
									</Link>
								</CardContent>
							</Card>
						</div>
					)
				) : (
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{applications.map((application) => (
							<Link
								key={application.id}
								to="/applications/$applicationId"
								params={{ applicationId: application.id }}
								className="group block h-full focus:outline-none"
							>
								<ApplicationCard
									id={application.id}
									status={application.status}
									appliedAt={application.appliedAt}
									job={application.job}
								/>
							</Link>
						))}
					</div>
				)}
			</main>
		</div>
	);
}
