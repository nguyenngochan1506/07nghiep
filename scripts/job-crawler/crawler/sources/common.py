from __future__ import annotations

import html
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urljoin, urlparse
from xml.etree import ElementTree

from scrapling.fetchers import Fetcher


USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125 Safari/537.36"


@dataclass
class CrawledJob:
    sourceSite: str
    sourceUrl: str
    externalId: str
    title: str
    companyName: str
    sourceCompanyUrl: str | None
    companyLogoUrl: str | None
    companyDescription: str | None
    companyWebsite: str | None
    companyIndustry: str | None
    companySize: str | None
    companyType: str | None
    companyCountry: str | None
    companyLocation: str | None
    companyWorkingDays: str | None
    companyOvertimePolicy: str | None
    companyCoverImageUrl: str | None
    companyLinkedinUrl: str | None
    companyJobOpeningsCount: int | None
    companyRaw: dict[str, Any] | None
    location: str
    description: str
    requirements: str | None
    benefits: str | None
    salary: dict[str, Any] | None
    jobIndustry: str | None
    jobType: str | None
    workType: str | None
    experienceLevel: str | None
    experienceMonths: int | None
    datePosted: str | None
    validThrough: str | None
    salaryCurrency: str | None
    salaryUnit: str | None
    streetAddress: str | None
    addressLocality: str | None
    addressRegion: str | None
    addressCountry: str | None
    directApply: bool | None
    applicantLocation: str | None
    skills: list[str]
    crawledAt: str
    raw: dict[str, Any]


def fetch(url: str):
    return Fetcher.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)


def xml_locs(xml_body: bytes) -> list[str]:
    root = ElementTree.fromstring(xml_body)
    locs: list[str] = []
    for elem in root.iter():
        if elem.tag.endswith("loc") and elem.text:
            locs.append(elem.text.strip())
    return locs


def text_or_empty(value: str | None) -> str:
    return html.unescape(value or "").strip()


def compact_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", text_or_empty(value))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def stable_id_from_url(url: str) -> str:
    path = urlparse(url).path.rstrip("/")
    tail = path.rsplit("/", 1)[-1]
    match = re.search(r"(\d+)$", tail)
    return match.group(1) if match else tail[:120]


def absolute_url(base_url: str, value: str | None) -> str | None:
    normalized = compact_text(value)
    if not normalized:
        return None
    return urljoin(base_url, normalized)


def meta(response, selector: str) -> str:
    return compact_text(response.css(selector).get(""))


def first_attr(response, selector: str, attr: str, base_url: str | None = None) -> str | None:
    value = compact_text(response.css(f"{selector}::attr({attr})").get(""))
    if not value:
        return None
    return absolute_url(base_url, value) if base_url else value


def json_ld_objects(response) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = []
    for node in response.css('script[type="application/ld+json"]::text'):
        try:
            parsed = json.loads(str(node))
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, list):
            objects.extend(item for item in parsed if isinstance(item, dict))
        elif isinstance(parsed, dict):
            objects.append(parsed)
    return objects


def json_ld_job(response) -> dict[str, Any]:
    for item in json_ld_objects(response):
        item_type = item.get("@type")
        if item_type == "JobPosting" or (
            isinstance(item_type, list) and "JobPosting" in item_type
        ):
            return item
    return {}


def html_to_text(value: str | None) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    return compact_text(text)


def text_between(text: str, start: str, end: str | None = None) -> str | None:
    start_match = re.search(re.escape(start), text, flags=re.IGNORECASE)
    if not start_match:
        return None
    segment = text[start_match.end() :]
    if end:
        end_match = re.search(re.escape(end), segment, flags=re.IGNORECASE)
        if end_match:
            segment = segment[: end_match.start()]
    return compact_text(segment) or None


def bool_from_schema(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        if value.upper() == "TRUE":
            return True
        if value.upper() == "FALSE":
            return False
    return None


def first_schema_value(value: Any) -> Any:
    if isinstance(value, list):
        return value[0] if value else None
    return value


def schema_address(job_posting: dict[str, Any]) -> dict[str, str | None]:
    location = first_schema_value(job_posting.get("jobLocation"))
    address = location.get("address") if isinstance(location, dict) else {}
    if not isinstance(address, dict):
        address = {}
    return {
        "streetAddress": compact_text(str(address.get("streetAddress") or "")) or None,
        "addressLocality": compact_text(str(address.get("addressLocality") or "")) or None,
        "addressRegion": compact_text(str(address.get("addressRegion") or "")) or None,
        "addressCountry": compact_text(str(address.get("addressCountry") or "")) or None,
    }


def location_from_schema(job_posting: dict[str, Any]) -> str | None:
    locations = job_posting.get("jobLocation")
    if not isinstance(locations, list):
        locations = [locations] if locations else []
    values: list[str] = []
    for location in locations:
        address = location.get("address") if isinstance(location, dict) else {}
        if not isinstance(address, dict):
            continue
        values.extend(
            [
                str(address.get("streetAddress") or ""),
                str(address.get("addressLocality") or ""),
                str(address.get("addressRegion") or ""),
            ]
        )
    return ", ".join(unique_strings(values, limit=8)) or None


def salary_from_schema(job_posting: dict[str, Any]) -> dict[str, Any] | None:
    salary = job_posting.get("baseSalary")
    if not isinstance(salary, dict):
        return None
    value = salary.get("value")
    if not isinstance(value, dict):
        return None
    raw_value = value.get("value")
    value_text = str(raw_value or "")
    return {
        "min": value.get("minValue"),
        "max": value.get("maxValue"),
        "value": raw_value,
        "unit": value.get("unitText"),
        "currency": salary.get("currency"),
        "isNegotiable": "negotiable" in value_text.lower()
        or "thỏa thuận" in value_text.lower()
        or "thoả thuận" in value_text.lower(),
    }


def experience_months_from_schema(job_posting: dict[str, Any]) -> int | None:
    experience = job_posting.get("experienceRequirements")
    if not isinstance(experience, dict):
        return None
    value = experience.get("monthsOfExperience")
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None


def applicant_location_from_schema(job_posting: dict[str, Any]) -> str | None:
    location = job_posting.get("applicantLocationRequirements")
    if isinstance(location, dict):
        return compact_text(str(location.get("name") or "")) or None
    if isinstance(location, list):
        return ", ".join(
            unique_strings(
                [str(item.get("name") or "") for item in location if isinstance(item, dict)]
            )
        ) or None
    return None


def unique_strings(values: Iterable[str | None], limit: int = 20) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        normalized = compact_text(value)
        key = normalized.lower()
        if not normalized or key in seen:
            continue
        seen.add(key)
        result.append(normalized)
        if len(result) >= limit:
            break
    return result


def infer_skills_from_text(text: str) -> list[str]:
    known_skills = [
        ".NET",
        "AI",
        "Android",
        "Angular",
        "AWS",
        "Azure",
        "C#",
        "C++",
        "CSS",
        "DevOps",
        "Docker",
        "Flutter",
        "Go",
        "HTML",
        "iOS",
        "Java",
        "JavaScript",
        "Kotlin",
        "Kubernetes",
        "Laravel",
        "Linux",
        "MySQL",
        "NodeJS",
        "PHP",
        "PostgreSQL",
        "Python",
        "QA",
        "React",
        "Ruby",
        "SQL",
        "Swift",
        "TypeScript",
        "Vue",
    ]
    haystack = f" {text.lower()} "
    return [
        skill
        for skill in known_skills
        if re.search(rf"(?<![a-z0-9+#.]){re.escape(skill.lower())}(?![a-z0-9+#.])", haystack)
    ][:20]


def write_jsonl(path: Path, jobs: Iterable[CrawledJob]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", encoding="utf-8") as file:
        for job in jobs:
            file.write(json.dumps(asdict(job), ensure_ascii=False, separators=(",", ":")))
            file.write("\n")
            count += 1
    return count
