type ParsedRichTextBlock =
  | { type: "heading"; value: string }
  | { type: "paragraph"; value: string }
  | { type: "list"; items: string[] };

const knownRichTextHeadings = new Set(
  [
    "Vai trò và trách nhiệm",
    "Kỹ năng và yêu cầu",
    "Quyền lợi dành cho bạn",
    "Chế độ lương, thưởng hấp dẫn",
    "Phúc lợi toàn diện",
    "Mô tả công việc",
    "Yêu cầu công việc",
    "Yêu cầu ứng viên",
    "Quyền lợi",
    "Giới thiệu",
    "Tổng quan",
    "Văn hóa công ty",
    "Môi trường làm việc",
  ].map((heading) => heading.toLocaleLowerCase("vi-VN")),
);

function normalizeRichText(value: string) {
  let normalized = value
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00a0]+/g, " ")
    .trim();

  const headingMap: Array<[RegExp, string]> = [
    [/\bYour role & responsibilities\b/gi, "Vai trò và trách nhiệm"],
    [/\bYour skills & qualifications\b/gi, "Kỹ năng và yêu cầu"],
    [/\bBenefits for you\b/gi, "Quyền lợi dành cho bạn"],
    [/\bJob description\b/gi, "Mô tả công việc"],
    [/\bRequirements\b/gi, "Yêu cầu công việc"],
    [/\bAbout us\b/gi, "Giới thiệu"],
    [/\bCompany overview\b/gi, "Tổng quan"],
  ];

  for (const [pattern, label] of headingMap) {
    normalized = normalized.replace(pattern, `\n\n${label}\n`);
  }

  return normalized
    .replace(/\s*[•●▪◦]\s*/g, "\n• ")
    .replace(/(Chế độ lương, thưởng[^.\n•]{0,80})(?=\n•)/gi, "\n\n$1\n")
    .replace(/(Phúc lợi toàn diện[^.\n•]{0,80})(?=\n•)/gi, "\n\n$1\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isRichTextHeading(line: string) {
  const normalizedLine = line.replace(/:$/, "").trim();
  const lowerLine = normalizedLine.toLocaleLowerCase("vi-VN");

  if (knownRichTextHeadings.has(lowerLine)) return true;

  return (
    normalizedLine.length <= 80 &&
    !/[.!?]$/.test(normalizedLine) &&
    /^(vai trò|kỹ năng|quyền lợi|yêu cầu|mô tả|chế độ|phúc lợi|giới thiệu|tổng quan|văn hóa|môi trường)/i.test(
      normalizedLine,
    )
  );
}

function parseRichText(value: string): ParsedRichTextBlock[] {
  const normalized = normalizeRichText(value);
  if (!normalized) return [];

  const blocks: ParsedRichTextBlock[] = [];
  const pendingBullets: string[] = [];
  let pendingHeading: string | null = null;

  const flushHeading = () => {
    if (!pendingHeading) return;
    blocks.push({ type: "heading", value: pendingHeading });
    pendingHeading = null;
  };

  const flushBullets = () => {
    if (pendingBullets.length === 0) return;
    blocks.push({ type: "list", items: [...pendingBullets] });
    pendingBullets.length = 0;
  };

  for (const line of normalized
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)) {
    if (line.startsWith("•")) {
      flushHeading();
      pendingBullets.push(line.replace(/^•\s*/, ""));
      continue;
    }

    flushBullets();

    if (isRichTextHeading(line)) {
      pendingHeading = line.replace(/:$/, "");
      continue;
    }

    flushHeading();
    blocks.push({ type: "paragraph", value: line });
  }

  flushBullets();

  return blocks;
}

export function RichTextBlock({
  text,
  fallback,
}: {
  text: string | null | undefined;
  fallback: string;
}) {
  const blocks = parseRichText(text ?? "");

  if (blocks.length === 0) {
    return <p className="leading-7 text-muted-foreground">{fallback}</p>;
  }

  return (
    <div className="space-y-4 leading-7 text-muted-foreground">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3
              key={`${block.type}-${index}-${block.value}`}
              className="pt-1 text-sm font-semibold text-foreground"
            >
              {block.value}
            </h3>
          );
        }

        if (block.type === "list") {
          return (
            <ul
              key={`${block.type}-${index}-${block.items.join("-")}`}
              className="list-disc space-y-2 pl-5 marker:text-brand-orange"
            >
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }

        return <p key={`${block.type}-${index}-${block.value}`}>{block.value}</p>;
      })}
    </div>
  );
}
