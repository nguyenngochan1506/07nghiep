from __future__ import annotations

import json
import re
from typing import Any, Iterable

from .common import (
    CrawledJob,
    absolute_url,
    applicant_location_from_schema,
    bool_from_schema,
    compact_text,
    experience_months_from_schema,
    fetch,
    first_attr,
    html_to_text,
    json_ld_job,
    location_from_schema,
    meta,
    now_iso,
    salary_from_schema,
    schema_address,
    stable_id_from_url,
    text_between,
    unique_strings,
    xml_locs,
)


SITEMAP_INDEX_URL = "https://topdev.vn/sitemap-jobs.xml"
BASE_URL = "https://topdev.vn"
_COMPANY_PROFILE_CACHE: dict[str, dict[str, Any]] = {}


def job_urls(limit: int | None = None, sitemap_pages: int = 1) -> list[str]:
    index_response = fetch(SITEMAP_INDEX_URL)
    sitemap_urls = xml_locs(index_response.body)[:sitemap_pages]
    urls: list[str] = []
    for sitemap_url in sitemap_urls:
        response = fetch(sitemap_url)
        urls.extend(xml_locs(response.body))
        if limit and len(urls) >= limit:
            return urls[:limit]
    return urls[:limit] if limit else urls


def _json_strings(html_text: str) -> Iterable[str]:
    for match in re.finditer(r'\{[^{}]*"detail_url"[^{}]*\}', html_text):
        yield match.group(0)


def _extract_embedded_job(html_text: str, url: str) -> dict[str, Any]:
    for raw_json in _json_strings(html_text):
        try:
            parsed = json.loads(raw_json)
        except json.JSONDecodeError:
            continue
        if parsed.get("detail_url") == url and parsed.get("title"):
            return parsed
    return {}


def _company_profile(url: str | None) -> dict[str, Any]:
    if not url:
        return {}
    full_url = absolute_url(BASE_URL, url)
    if not full_url:
        return {}
    if full_url in _COMPANY_PROFILE_CACHE:
        return _COMPANY_PROFILE_CACHE[full_url]

    response = fetch(full_url)
    if response.status >= 400:
        _COMPANY_PROFILE_CACHE[full_url] = {}
        return {}

    body_text = compact_text(response.get_all_text(ignore_tags=("script", "style")))
    job_openings_match = re.search(r"(\d[\d.,]*)\s+Job Openings", body_text, flags=re.IGNORECASE)
    website = None
    linkedin = None
    for anchor in response.css("a"):
        attrs = getattr(anchor, "attrib", {}) or {}
        href = compact_text(str(attrs.get("href", "")))
        if not href.startswith("http"):
            continue
        lower_href = href.lower()
        if "linkedin.com" in lower_href:
            linkedin = linkedin or href
        elif "topdev.vn" not in lower_href and "facebook.com" not in lower_href:
            website = website or href

    profile = {
        "url": full_url,
        "description": meta(response, 'meta[name="description"]::attr(content)') or None,
        "logoUrl": first_attr(response, "img[alt*='company-image']", "src", BASE_URL),
        "website": website,
        "industry": text_between(body_text, "Industry:", "Size:"),
        "companySize": text_between(body_text, "Size:", "Company Website")
        or text_between(body_text, "Size:", "Job Openings"),
        "country": text_between(body_text, "Country:", "Industry:"),
        "coverImageUrl": first_attr(response, "img.object-cover", "src", BASE_URL)
        or meta(response, 'meta[property="og:image"]::attr(content)')
        or None,
        "linkedinUrl": linkedin,
        "jobOpeningsCount": int(job_openings_match.group(1).replace(".", "").replace(",", ""))
        if job_openings_match
        else None,
    }
    _COMPANY_PROFILE_CACHE[full_url] = profile
    return profile


def _employment_type(value: Any) -> str | None:
    if isinstance(value, list):
        return ", ".join(str(item) for item in value)
    return str(value) if value else None


def _title_company_from_meta(response) -> tuple[str, str]:
    og_title = meta(response, 'meta[property="og:title"]::attr(content)')
    match = re.match(r"Recruiting (?P<title>.+?) at (?P<company>.+?) \|", og_title)
    if match:
        return compact_text(match.group("title")), compact_text(match.group("company"))
    title = compact_text(response.css("h1::text").get("")) or og_title.split("|")[0].replace("Recruiting", "").strip()
    return title, "TopDev Employer"


def _location_skills_from_description(description: str) -> tuple[str, list[str]]:
    location = ""
    skills: list[str] = []
    location_match = re.search(r" at (?P<location>.+?), with skills:", description)
    if location_match:
        location = compact_text(location_match.group("location"))
    skills_match = re.search(r"with skills: (?P<skills>.+?)\. Apply", description)
    if skills_match:
        skills = [compact_text(skill) for skill in skills_match.group("skills").split(",")]
    return location, skills


def parse_job(url: str) -> CrawledJob | None:
    response = fetch(url)
    if response.status >= 400:
        return None

    job_posting = json_ld_job(response)
    hiring_organization = job_posting.get("hiringOrganization")
    if not isinstance(hiring_organization, dict):
        hiring_organization = {}
    address = schema_address(job_posting)
    schema_salary = salary_from_schema(job_posting)
    html_text = response.body.decode(response.encoding or "utf-8", errors="ignore")
    embedded = _extract_embedded_job(html_text, url)
    title_from_meta, company_from_meta = _title_company_from_meta(response)
    company = embedded.get("company") if isinstance(embedded.get("company"), dict) else {}
    salary = schema_salary or (embedded.get("salary") if isinstance(embedded.get("salary"), dict) else None)
    addresses = embedded.get("addresses") if isinstance(embedded.get("addresses"), dict) else {}
    source_company_url = (
        compact_text(str(hiring_organization.get("sameAs") or ""))
        or company.get("detail_url")
        or None
    )
    company_profile = _company_profile(source_company_url)

    skills = embedded.get("skills_arr") or embedded.get("skills") or []
    if not isinstance(skills, list):
        skills = []
    meta_description = meta(response, 'meta[name="description"]::attr(content)')
    location_from_meta, skills_from_meta = _location_skills_from_description(meta_description)
    schema_skills = [skill for skill in str(job_posting.get("skills") or "").split(",")]

    location = (
        location_from_schema(job_posting)
        or addresses.get("address_region_list")
        or addresses.get("sort_addresses")
        or location_from_meta
        or "Vietnam"
    )

    description = compact_text(
        html_to_text(str(job_posting.get("description") or ""))
        or embedded.get("responsibilities_original")
        or meta(response, 'meta[name="description"]::attr(content)')
        or response.get_all_text(ignore_tags=("script", "style"))[:1200]
    )
    logo_url = (
        compact_text(str(hiring_organization.get("logo") or ""))
        or company_profile.get("logoUrl")
        or first_attr(response, "img[alt='job-image']", "src", BASE_URL)
    )
    cover_image_url = (
        company_profile.get("coverImageUrl")
        or first_attr(response, "img[alt='company-image-cover']", "src", BASE_URL)
        or meta(response, 'meta[property="og:image"]::attr(content)')
        or None
    )
    company_name = compact_text(
        str(
            company.get("display_name")
            or hiring_organization.get("name")
            or company_from_meta
        )
    )

    return CrawledJob(
        sourceSite="topdev",
        sourceUrl=url,
        externalId=str(embedded.get("id") or stable_id_from_url(url)),
        title=compact_text(str(job_posting.get("title") or embedded.get("title") or title_from_meta)),
        companyName=company_name,
        sourceCompanyUrl=absolute_url(BASE_URL, str(source_company_url)) if source_company_url else None,
        companyLogoUrl=logo_url,
        companyDescription=compact_text(str(hiring_organization.get("description") or "")) or company_profile.get("description"),
        companyWebsite=company_profile.get("website"),
        companyIndustry=company_profile.get("industry")
        or ", ".join(company.get("industries_arr") if isinstance(company.get("industries_arr"), list) else [])
        or compact_text(str(job_posting.get("industry") or ""))
        or None,
        companySize=company_profile.get("companySize") or company.get("company_size"),
        companyType=None,
        companyCountry=company_profile.get("country"),
        companyLocation=compact_text(str(location)),
        companyWorkingDays=None,
        companyOvertimePolicy=None,
        companyCoverImageUrl=cover_image_url,
        companyLinkedinUrl=company_profile.get("linkedinUrl"),
        companyJobOpeningsCount=company_profile.get("jobOpeningsCount"),
        companyRaw=company_profile or None,
        location=compact_text(str(location)),
        description=description,
        requirements=compact_text(str(embedded.get("requirements_original") or "")) or None,
        benefits=html_to_text(str(job_posting.get("jobBenefits") or ""))
        or compact_text(str(embedded.get("benefits_original") or ""))
        or None,
        salary=salary,
        jobIndustry=compact_text(str(job_posting.get("industry") or "")) or None,
        jobType=_employment_type(job_posting.get("employmentType"))
        or str(embedded.get("contract_types_str") or "Fulltime"),
        workType=str(location),
        experienceLevel=str(embedded.get("job_levels_str") or embedded.get("experiences_str") or title_from_meta),
        experienceMonths=experience_months_from_schema(job_posting),
        datePosted=compact_text(str(job_posting.get("datePosted") or "")) or None,
        validThrough=compact_text(str(job_posting.get("validThrough") or "")) or None,
        salaryCurrency=compact_text(str((schema_salary or {}).get("currency") or "")) or None,
        salaryUnit=compact_text(str((schema_salary or {}).get("unit") or "")) or None,
        streetAddress=address["streetAddress"],
        addressLocality=address["addressLocality"],
        addressRegion=address["addressRegion"],
        addressCountry=address["addressCountry"],
        directApply=bool_from_schema(job_posting.get("directApply")),
        applicantLocation=applicant_location_from_schema(job_posting),
        skills=unique_strings([*[str(skill) for skill in skills], *skills_from_meta, *schema_skills]),
        crawledAt=now_iso(),
        raw={
            "status": response.status,
            "metaDescription": meta_description,
            "jobPosting": job_posting,
            "embedded": embedded,
            "companyProfile": company_profile,
        },
    )


def crawl(limit: int | None = None, sitemap_pages: int = 1) -> Iterable[CrawledJob]:
    for url in job_urls(limit=limit, sitemap_pages=sitemap_pages):
        job = parse_job(url)
        if job:
            yield job
