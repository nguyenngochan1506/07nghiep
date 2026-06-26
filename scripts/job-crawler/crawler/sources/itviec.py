from __future__ import annotations

import re
from typing import Any
from typing import Iterable

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


SITEMAP_URL = "https://itviec.com/twinnings_jobs_desc_en.xml"
BASE_URL = "https://itviec.com"
_COMPANY_PROFILE_CACHE: dict[str, dict[str, Any]] = {}


def job_urls(limit: int | None = None) -> list[str]:
    response = fetch(SITEMAP_URL)
    urls = xml_locs(response.body)
    return urls[:limit] if limit else urls


def _title_from_response(response, url: str) -> str:
    title = compact_text(response.css("h1::text").get(""))
    if title:
        return title
    og_title = meta(response, 'meta[property="og:title"]::attr(content)')
    if og_title:
        return og_title.split("|")[0].strip()
    return stable_id_from_url(url).replace("-", " ").title()


def _description_from_meta(response) -> tuple[str, str, str]:
    description = meta(response, 'meta[name="description"]::attr(content)')
    match = re.match(r"(?P<company>.+?) is hiring (?P<title>.+?) at (?P<location>.+?)\.", description)
    if not match:
        return "", "", description
    return (
        compact_text(match.group("company")),
        compact_text(match.group("location")),
        description,
    )


def _company_url(response, company_name: str) -> str | None:
    company_key = company_name.lower()
    fallback: str | None = None
    for anchor in response.css("a"):
        attrs = getattr(anchor, "attrib", {}) or {}
        href = compact_text(str(attrs.get("href", "")))
        if not href.startswith("/companies/") or "lab_feature" in href:
            continue
        text = compact_text(anchor.get_all_text() if hasattr(anchor, "get_all_text") else str(anchor))
        full_url = absolute_url(BASE_URL, href)
        if text and company_key and company_key in text.lower():
            return full_url
        fallback = fallback or full_url
    return fallback


def _external_link(response, exclude_domains: list[str]) -> str | None:
    for anchor in response.css("a"):
        attrs = getattr(anchor, "attrib", {}) or {}
        href = compact_text(str(attrs.get("href", "")))
        if not href.startswith("http"):
            continue
        lower_href = href.lower()
        if any(domain in lower_href for domain in exclude_domains):
            continue
        return href
    return None


def _company_profile(url: str | None) -> dict[str, Any]:
    if not url:
        return {}
    if url in _COMPANY_PROFILE_CACHE:
        return _COMPANY_PROFILE_CACHE[url]

    response = fetch(url)
    if response.status >= 400:
        _COMPANY_PROFILE_CACHE[url] = {}
        return {}

    body_text = compact_text(response.get_all_text(ignore_tags=("script", "style")))
    company_type = text_between(body_text, "Company type", "Company industry")
    industry = text_between(body_text, "Company industry", "Company size")
    company_size = text_between(body_text, "Company size", "Country")
    country = text_between(body_text, "Country", "Working days")
    working_days = text_between(body_text, "Working days", "Overtime policy")
    overtime_policy = text_between(body_text, "Overtime policy", "Company website")
    logo = first_attr(response, "img[alt*='Big Logo']", "data-src", BASE_URL) or first_attr(
        response, "img[alt*='Small Logo']",
        "data-src",
        BASE_URL,
    )
    cover = meta(response, 'meta[property="og:image"]::attr(content)') or None
    website = _external_link(
        response,
        [
            "itviec.com",
            "linkedin.com",
            "facebook.com",
            "youtube.com",
            "instagram.com",
            "tiktok.com",
            "twitter.com",
            "x.com",
        ],
    )
    linkedin = next(
        (
            compact_text(str((getattr(anchor, "attrib", {}) or {}).get("href", "")))
            for anchor in response.css("a")
            if "linkedin.com" in compact_text(str((getattr(anchor, "attrib", {}) or {}).get("href", ""))).lower()
        ),
        None,
    )

    profile = {
        "url": url,
        "description": meta(response, 'meta[name="description"]::attr(content)') or None,
        "logoUrl": logo,
        "website": website,
        "industry": industry,
        "companySize": company_size,
        "companyType": company_type,
        "country": country,
        "workingDays": working_days,
        "overtimePolicy": overtime_policy,
        "coverImageUrl": cover,
        "linkedinUrl": linkedin,
    }
    _COMPANY_PROFILE_CACHE[url] = profile
    return profile


def _employment_type(value: Any) -> str | None:
    if isinstance(value, list):
        return ", ".join(str(item) for item in value)
    return str(value) if value else None


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
    company_from_meta, location_from_meta, meta_description = _description_from_meta(response)
    title = compact_text(str(job_posting.get("title") or "")) or _title_from_response(response, url)
    company = (
        compact_text(str(hiring_organization.get("name") or ""))
        or compact_text(response.css('[class*="company"] h2::text').get(""))
        or company_from_meta
    )
    source_company_url = _company_url(response, company)
    company_profile = _company_profile(source_company_url)
    location = (
        location_from_schema(job_posting)
        or compact_text(response.css('[class*="address"]::text').get(""))
        or location_from_meta
        or "Vietnam"
    )

    body_text = response.get_all_text(ignore_tags=("script", "style"))
    description = html_to_text(str(job_posting.get("description") or "")) or meta_description or compact_text(body_text[:1200])
    skills = unique_strings(
        [
            *str(job_posting.get("skills") or "").split(","),
            *str(title).replace("/", " ").split(),
            *str(meta_description).split(","),
        ],
        limit=40,
    )

    return CrawledJob(
        sourceSite="itviec",
        sourceUrl=url,
        externalId=stable_id_from_url(url),
        title=title,
        companyName=company or "ITviec Employer",
        sourceCompanyUrl=source_company_url,
        companyLogoUrl=compact_text(str(hiring_organization.get("logo") or "")) or company_profile.get("logoUrl"),
        companyDescription=compact_text(str(hiring_organization.get("description") or "")) or company_profile.get("description"),
        companyWebsite=company_profile.get("website"),
        companyIndustry=company_profile.get("industry") or compact_text(str(job_posting.get("industry") or "")) or None,
        companySize=company_profile.get("companySize"),
        companyType=company_profile.get("companyType"),
        companyCountry=company_profile.get("country"),
        companyLocation=location,
        companyWorkingDays=company_profile.get("workingDays"),
        companyOvertimePolicy=company_profile.get("overtimePolicy"),
        companyCoverImageUrl=company_profile.get("coverImageUrl"),
        companyLinkedinUrl=company_profile.get("linkedinUrl"),
        companyJobOpeningsCount=None,
        companyRaw=company_profile or None,
        location=location,
        description=description,
        requirements=None,
        benefits=html_to_text(str(job_posting.get("jobBenefits") or "")) or None,
        salary=schema_salary,
        jobIndustry=compact_text(str(job_posting.get("industry") or "")) or None,
        jobType=_employment_type(job_posting.get("employmentType")) or "Fulltime",
        workType=location,
        experienceLevel=title,
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
        skills=skills,
        crawledAt=now_iso(),
        raw={
            "status": response.status,
            "metaDescription": meta_description,
            "jobPosting": job_posting,
            "companyProfile": company_profile,
        },
    )


def crawl(limit: int | None = None) -> Iterable[CrawledJob]:
    for url in job_urls(limit=limit):
        job = parse_job(url)
        if job:
            yield job
