export const SITE_URL = "https://07nghiep.site";
export const SITE_NAME = "07nghiep";
export const DEFAULT_IMAGE = `${SITE_URL}/07logo.png`;
export const DEFAULT_KEYWORDS = "tìm việc, việc làm, tuyển dụng, ứng tuyển, công ty, 07nghiep";

export function createSeoHead({
  title,
  description,
  image = DEFAULT_IMAGE,
  url,
  keywords = DEFAULT_KEYWORDS,
  noIndex = false,
}: {
  title: string;
  description: string;
  image?: string;
  url: string;
  keywords?: string;
  noIndex?: boolean;
}) {
  const meta: Record<string, string>[] = [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];

  if (noIndex) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  }

  const links: Record<string, string>[] = [
    { rel: "icon", href: "/07logo.png" },
    { rel: "canonical", href: url },
  ];

  return { meta, links };
}
