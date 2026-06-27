import { cn } from "@07nghiep/ui/lib/utils";
import type { ReactNode } from "react";

const heroImageClass = {
  jobs: "bg-[url('/images/candidate-home/hero.webp')] bg-[position:center_42%]",
  organizations:
    "bg-[url('/images/candidate-home/company-research.webp')] bg-[position:center_38%]",
  saved: "bg-[url('/images/candidate-home/career-planning.webp')] bg-[position:center_42%]",
  applications: "bg-[url('/images/candidate-home/career-planning.webp')] bg-[position:center_45%]",
} as const;

type PageHeroProps = {
  image: keyof typeof heroImageClass;
  eyebrow?: ReactNode;
  title: string;
  description: string;
  meta?: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
  className?: string;
  contentClassName?: string;
};

export function PageHero({
  image,
  eyebrow,
  title,
  description,
  meta,
  children,
  align = "left",
  className,
  contentClassName,
}: PageHeroProps) {
  return (
    <section className={cn("relative border-b bg-surface-wash", className)}>
      <div
        className={cn("absolute inset-0 bg-cover opacity-35 saturate-90", heroImageClass[image])}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.985_0.01_235/0.98)_0%,oklch(0.965_0.02_225/0.92)_42%,oklch(0.94_0.03_210/0.6)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(1_0_0/0.7),transparent_30%)]" />

      <div
        className={cn(
          "relative mx-auto flex max-w-7xl flex-col gap-7 px-4 py-12 md:px-8 md:py-14",
          align === "center" && "items-center text-center",
          contentClassName,
        )}
      >
        <div
          className={cn(
            "flex max-w-3xl flex-col gap-3",
            align === "center" && "mx-auto items-center",
          )}
        >
          {eyebrow}
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {description}
          </p>
          {meta ? <div className="text-sm text-muted-foreground">{meta}</div> : null}
        </div>

        {children}
      </div>
    </section>
  );
}
