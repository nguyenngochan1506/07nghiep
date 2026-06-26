from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sources import itviec, topdev
from sources.common import write_jsonl


SOURCES = {
    "itviec": itviec.crawl,
    "topdev": topdev.crawl,
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Crawl ITviec and TopDev jobs into JSONL.")
    parser.add_argument("--source", choices=[*SOURCES.keys(), "all"], default="all")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--topdev-sitemap-pages", type=int, default=1)
    parser.add_argument("--out-dir", default="data/crawled-jobs")
    argv = sys.argv[1:]
    if argv and argv[0] == "--":
        argv = argv[1:]
    args = parser.parse_args(argv)

    out_dir = Path(args.out_dir)
    selected = SOURCES.keys() if args.source == "all" else [args.source]

    for source in selected:
        if source == "topdev":
            jobs = topdev.crawl(limit=args.limit, sitemap_pages=args.topdev_sitemap_pages)
        else:
            jobs = SOURCES[source](limit=args.limit)
        output = out_dir / f"{source}.jsonl"
        count = write_jsonl(output, jobs)
        print(f"{source}: wrote {count} jobs to {output}")


if __name__ == "__main__":
    main()
