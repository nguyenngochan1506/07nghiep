import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@07nghiep/ui/components/button";
import {
	Sheet as Dialog,
	SheetContent as DialogContent,
	SheetDescription as DialogDescription,
	SheetHeader as DialogHeader,
	SheetTitle as DialogTitle,
} from "@07nghiep/ui/components/sheet";
import { trpc } from "@/utils/trpc";

const COVER_MAX = 2000;

const applyJobSchema = z.object({
	coverLetter: z
		.string()
		.trim()
		.min(50, "Cover letter must be at least 50 characters")
		.max(COVER_MAX, `Cover letter cannot exceed ${COVER_MAX} characters`),
	resumeChoice: z.enum(["profile", "upload", "none"]).optional(),
});

type ApplyJobFormValues = z.infer<typeof applyJobSchema>;

type ApplyJobModalProps = {
	jobId: string;
	jobStatus: string;
	hasApplied: boolean;
	isProfileComplete: boolean;
};

function getTriggerState(jobStatus: string, hasApplied: boolean, isProfileComplete: boolean) {
	if (jobStatus !== "OPEN") return { disabled: true, label: "Vị trí đã đóng" };
	if (hasApplied) return { disabled: true, label: "Đã ứng tuyển" };
	if (!isProfileComplete) return { disabled: true, label: "Hoàn thành hồ sơ để ứng tuyển" };
	return { disabled: false, label: "Ứng tuyển ngay" };
}

export default function ApplyJobModal({ jobId, jobStatus, hasApplied, isProfileComplete }: ApplyJobModalProps) {
	const [open, setOpen] = useState(false);
	const triggerState = getTriggerState(jobStatus, hasApplied, isProfileComplete);

	// get profile to display resume option
	const profileQuery = useQuery(trpc.profile.getMyProfile.queryOptions());

	const form = useForm<ApplyJobFormValues>({
		resolver: zodResolver(applyJobSchema),
		defaultValues: { coverLetter: "", resumeChoice: profileQuery.data?.resumeUrl ? "profile" : "none" },
	});

	const [uploadedFile, setUploadedFile] = useState<File | null>(null);

	const { mutateAsync, isPending } = useMutation(trpc.applications.applyJob.mutationOptions());

	useEffect(() => {
		if (!open) {
			form.reset({ coverLetter: "", resumeChoice: "none" });
			setUploadedFile(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	useEffect(() => {
		if (open && profileQuery.data?.resumeUrl) {
			form.setValue("resumeChoice", "profile");
		}
	}, [open, profileQuery.data?.resumeUrl]);

	const onSubmit = form.handleSubmit(async (values) => {
		try {
			// handle upload placeholder
			if (values.resumeChoice === "upload") {
				if (!uploadedFile) {
					toast.error("Vui lòng chọn tệp để tải lên hoặc chọn sơ yếu lý lịch của bạn.");
					return;
				}
				// Upload logic placeholder
				toast.error("Chức năng tải lên hồ sơ xin việc mới hiện chưa được triển khai. Vui lòng sử dụng hồ sơ xin việc có sẵn trong hồ sơ của bạn.");
				return;
			}

			const finalResume = values.resumeChoice === "profile" ? profileQuery.data?.resumeUrl : undefined;

			await mutateAsync({ jobId, coverLetter: values.coverLetter, resumeUrl: finalResume ?? undefined });

			toast.success("Đơn đăng ký đã được gửi thành công.");
			setOpen(false);
			form.reset();
		} catch (err) {
			const message = err instanceof Error ? err.message : "Không thể nộp đơn";
			toast.error(message);
		}
	});

	const coverCount = form.watch("coverLetter")?.length ?? 0;

	return (
		<>
			<Button disabled={triggerState.disabled} onClick={() => setOpen(true)}>
				{triggerState.label}
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent side="right" className="w-full sm:max-w-xl">
					<DialogHeader className="border-b pb-3">
						<DialogTitle>Nộp đơn cho vị trí này</DialogTitle>
						<DialogDescription>Đề xuất một thư xin việc ngắn gọn và chọn một bản sơ yếu lý lịch.</DialogDescription>
					</DialogHeader>

					<form onSubmit={onSubmit} className="space-y-4 p-4">
						<div className="space-y-2">
							<label htmlFor="coverLetter" className="text-xs font-medium text-foreground">
								Thư xin việc
							</label>
							<textarea
								id="coverLetter"
								rows={8}
								placeholder="Hãy cho nhà tuyển dụng biết lý do tại sao bạn là người phù hợp nhất cho vị trí này..."
								aria-invalid={Boolean(form.formState.errors.coverLetter)}
								className="w-full rounded-none border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
								{...form.register("coverLetter")}
							/>
							<div className="flex items-center justify-between">
								{form.formState.errors.coverLetter ? (
									<p className="text-xs text-destructive">{form.formState.errors.coverLetter.message}</p>
								) : (
									<span />
								)}
								<p className="text-xs text-muted-foreground">{coverCount}/{COVER_MAX}</p>
							</div>
						</div>

						<div className="space-y-2">
							<p className="text-xs font-medium text-foreground">Resume</p>

							{profileQuery.data?.resumeUrl ? (
								<div className="flex items-center gap-3">
									<label className="inline-flex items-center gap-2">
										<input
											type="radio"
											value="profile"
											{...form.register("resumeChoice")}
											defaultChecked
										/>
										<span className="text-sm">Sử dụng hồ sơ xin việc của tôi</span>
									</label>
									<span className="text-xs text-muted-foreground">{profileQuery.data.resumeUrl.split("/").pop()}</span>
								</div>
							) : null}

							<div className="flex items-center gap-3">
								<label className="inline-flex items-center gap-2">
									<input type="radio" value="upload" {...form.register("resumeChoice")} />
									<span className="text-sm">Tải lên hồ sơ xin việc mới</span>
								</label>
								<input
									type="file"
									accept=".pdf,.doc,.docx"
									onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)}
								/>
								{uploadedFile ? <span className="text-xs">{uploadedFile.name}</span> : null}
							</div>

							<p className="text-xs text-muted-foreground">Nếu bạn không chọn một bản hồ sơ xin việc, hệ thống sẽ sử dụng hồ sơ xin việc trong hồ sơ của bạn nếu có sẵn.</p>
						</div>

						<div className="flex items-center justify-end gap-2 border-t pt-4">
							<Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
								Hủy
							</Button>
							<Button type="submit" disabled={isPending}>
								{isPending ? "Submitting..." : "Nộp đơn đăng ký"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
