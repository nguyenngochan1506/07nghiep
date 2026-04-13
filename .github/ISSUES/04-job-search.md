# Issue #4: Job Search & Filter

## Metadata
- **Issue Number:** #4
- **Labels:** `app/candidate`, `type/feature`, `priority/high`, `size/l`
- **Assignee:** Dev 2 (Candidate App Lead)
- **Milestone:** M2 - Candidate MVP
- **Epic:** Candidate Features
- **Estimate:** 16-20h

## Problem Statement

Candidates need to be able to search and discover job opportunities with advanced filtering options. This includes a job listing page, search functionality, filters, and job detail pages.

## Requirements

### 1. Job Listing Route

Create `/jobs` route with:
- Search bar with debounced input
- Grid/list view toggle
- Sort options (newest, salary high/low, relevance)
- Infinite scroll pagination

### 2. Search & Filters

**Search Bar:**
- Search by job title, company name, keywords
- Debounced input (300ms)
- Search suggestions (optional)

**Filter Components:**

| Filter | Type | Options |
|--------|------|---------|
| Location | Multi-select | Cities (Ho Chi Minh, Hanoi, Da Nang, etc.) |
| Work Type | Chips | Remote, Hybrid, Onsite |
| Job Type | Checkbox | Full-time, Part-time, Contract, Internship |
| Experience | Checkbox | Entry, Junior, Mid, Senior, Lead |
| Salary | Range Slider | Min-Max with presets |
| Posted Date | Select | Last 24h, Last 7 days, Last 30 days |
| Skills | Tag Input | Autocomplete from database |

### 3. Job Card Component

```typescript
interface JobCardProps {
  job: {
    id: string;
    title: string;
    organization: { name: string; logo?: string; verified: boolean };
    location: string;
    workType: 'REMOTE' | 'HYBRID' | 'ONSITE';
    jobType: 'FULLTIME' | 'PARTIME' | 'CONTRACT' | 'INTERNSHIP';
    salaryMin?: number;
    salaryMax?: number;
    salaryType?: 'MONTHLY' | 'YEARLY';
    salaryNegotiable: boolean;
    publishedAt: Date;
    skills: string[];
  };
  isSaved: boolean;
  onToggleSave: () => void;
}
```

### 4. Job Detail Route

Create `/jobs/$jobId` route:
- Full job description
- Company information panel
- Apply button
- Save job button
- Share button
- Related jobs section
- View counter (increment on view)

### 5. Save/Favorite Jobs

- Toggle save status
- View saved jobs in `/saved-jobs` route
- Visual indicator on saved job cards

## Tasks Checklist

```markdown
- [ ] 1. Create job listing route /jobs
- [ ] 2. Create job-filters component
- [ ] 3. Create job-card component
- [ ] 4. Create job detail route /jobs/$jobId
- [ ] 5. Implement debounced search
- [ ] 6. Implement filter components
- [ ] 7. Create infinite scroll/pagination
- [ ] 8. Implement save/unsave job
- [ ] 9. Create saved-jobs route
- [ ] 10. Add empty state
- [ ] 11. Add loading skeletons
- [ ] 12. Responsive design
```

## Files to Create

```
apps/candidate/src/
├── routes/
│   ├── jobs.tsx              # Job listing
│   ├── jobs.$jobId.tsx       # Job detail
│   └── saved-jobs.tsx        # Saved jobs
├── components/
│   ├── job-card.tsx          # Job card
│   ├── job-filters.tsx       # Filter sidebar
│   ├── job-search.tsx        # Search input
│   ├── location-filter.tsx   # Location multi-select
│   ├── salary-filter.tsx     # Salary range slider
│   └── job-list.tsx          # Job list with infinite scroll
```

## Files to Modify

```
apps/candidate/src/routes/__root.tsx    # Add navigation
apps/candidate/src/components/header.tsx # Add Jobs link
```

## API Endpoints Needed

```typescript
// jobs.ts router
jobs.list: protectedProcedure.input(jobsFilterSchema).query(...)
jobs.getById: publicProcedure.input(z.object({ id: z.string() })).query(...)
jobs.incrementView: protectedProcedure.input(z.object({ id: z.string() })).mutation(...)

// savedJobs.ts router
savedJobs.toggle: candidateProcedure.input(z.object({ jobId: z.string() })).mutation(...)
savedJobs.list: candidateProcedure.query(...)
savedJobs.isSaved: candidateProcedure.input(z.object({ jobId: z.string() })).query(...)
```

## Dependencies

- **Blocked By:** 
  - #3 (API Foundation) - need jobs list API
  - #2 (Auth Enhancement) - need candidateProcedure

## Design Notes

### Job Card Design
```
┌─────────────────────────────────────────────────┐
│ [Company Logo]  Company Name ✓                 │
│                                                 │
│ Job Title Here                                  │
│                                                 │
│ 📍 Ho Chi Minh City  🏠 Remote  ⏰ Full-time    │
│                                                 │
│ 💰 $1,500 - $2,500 / month                      │
│                                                 │
│ [React] [TypeScript] [Node.js] ...             │
│                                                 │
│ Posted 2 days ago              [♡ Save] [Apply]│
└─────────────────────────────────────────────────┘
```

### Color Coding for Work Type
- Remote: `--success` (green)
- Hybrid: `--warning` (amber)
- Onsite: `--muted-foreground`

## Success Criteria

1. Job listing loads with pagination
2. Search filters jobs in real-time
3. All filter combinations work correctly
4. Job detail shows full information
5. Save/unsave works and persists
6. Empty states for no results
7. Loading skeletons while fetching
8. Responsive on mobile

## Related Issues

- #3 (API Foundation) - prerequisite
- #5 (Profile & CV) - prerequisite for applying
- #6 (Application Flow) - uses job detail page
