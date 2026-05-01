# Issue #6: Job Application Flow

## Metadata
- **Issue Number:** #6
- **Labels:** `app/candidate`, `type/feature`, `priority/high`, `size/m`
- **Assignee:** Dev 2 (Candidate App Lead)
- **Milestone:** M2 - Candidate MVP
- **Epic:** Candidate Features
- **Estimate:** 10-12h

## Problem Statement

Candidates need to be able to apply for jobs by submitting their application with a cover letter, track the status of their applications, and withdraw applications if needed.

## Requirements

### 1. Apply to Job

On job detail page (`/jobs/$jobId`):

**Apply Button States:**
- Default: "Apply Now"
- Profile incomplete: "Complete Profile to Apply" (disabled)
- Already applied: "Already Applied" (view status)
- Job closed: "Position Closed"

**Application Form (Modal or Page):**
```typescript
interface ApplicationFormData {
  coverLetter: string; // Required, max 2000 chars
  resumeUrl?: string; // Use profile resume if not provided
  answers?: Record<string, string>; // Job-specific questions
}
```

Fields:
1. Cover Letter (rich text)
2. Resume selection (use profile resume or upload new)
3. Additional questions (if job has any)

### 2. My Applications Page

Route: `/applications`

**Features:**
- List of all applications
- Filter by status
- Sort by date (newest/oldest)
- Search by job title/company

**Application Card:**
```
┌─────────────────────────────────────────────────┐
│ Software Engineer - Tech Company Inc.          │
│                                                 │
│ Status: ⏳ Interview Scheduled                   │
│ Applied: Jan 15, 2026                           │
│                                                 │
│ [View Job]  [Withdraw Application]  [Message]  │
└─────────────────────────────────────────────────┘
```

### 3. Application Status Tracker

Visual status progression:
```
[Applied] → [Viewed] → [Shortlisted] → [Interview] → [Offered]
     ↓          ↓           ↓             ↓           ↓
  PENDING    VIEWED    SHORTLISTED    INTERVIEW    OFFERED
                            ↓             ↓
                         REJECTED      REJECTED
```

### 4. Application Detail

Route: `/applications/$applicationId`

Display:
- Job information
- Application timeline
- Status history
- Cover letter (view/edit if pending)
- Employer notes (view only - if shared)
- Messages thread

### 5. Withdraw Application

- Confirmation modal
- Reason selection (optional)
- Can only withdraw if status is PENDING or VIEWED
- Update status to WITHDRAWN

## Tasks Checklist

```markdown
- [ ] 1. Create application API endpoints
- [ ] 2. Add Apply button on job detail
- [ ] 3. Create application modal/form
- [ ] 4. Create my applications route /applications
- [ ] 5. Create application card component
- [ ] 6. Create application status tracker
- [ ] 7. Create application detail route
- [ ] 8. Implement withdraw functionality
- [ ] 9. Add application notifications
- [ ] 10. Add application filters
- [ ] 11. Empty state for no applications
```

## Files to Create

```
apps/candidate/src/
├── routes/
│   ├── applications.tsx           # My applications list
│   └── applications.$id.tsx       # Application detail
├── components/
│   ├── application/
│   │   ├── apply-button.tsx
│   │   ├── application-form.tsx
│   │   ├── application-card.tsx
│   │   ├── application-status.tsx
│   │   ├── application-timeline.tsx
│   │   └── withdraw-modal.tsx
```

## Files to Modify

```
apps/candidate/src/routes/jobs.$jobId.tsx  # Add apply button
apps/candidate/src/components/header.tsx   # Add Applications link
```

## API Endpoints Needed

```typescript
// applications.ts router
applications.applyJob: candidateProcedure
  .input(applySchema)
  .mutation(...)

applications.list: candidateProcedure
  .input(listApplicationsSchema.optional())
  .query(...)

applications.getById: candidateProcedure
  .input(z.object({ id: z.string() }))
  .query(...)

applications.update: candidateProcedure
  .input(z.object({ 
    id: z.string(),
    coverLetter: z.string().optional()
  }))
  .mutation(...)

applications.withdraw: candidateProcedure
  .input(z.object({ id: z.string() }))
  .mutation(...)
```

## Design Notes

### Status Colors
| Status | Color |
|--------|-------|
| PENDING | `--muted-foreground` |
| VIEWED | `--primary` |
| SHORTLISTED | `--success` |
| INTERVIEW | `--warning` |
| OFFERED | `--success` (bright) |
| REJECTED | `--destructive` |
| WITHDRAWN | `--muted-foreground` |

### Application Timeline
```
● Jan 15, 2026 - Applied
│
● Jan 16, 2026 - Application viewed by employer
│
● Jan 18, 2026 - Moved to Shortlisted
│
● Jan 20, 2026 - Interview scheduled for Jan 25
```

## Dependencies

- **Blocked By:** 
  - #3 (API Foundation) - need application APIs
  - #4 (Job Search) - uses job detail page
  - #5 (Profile & CV) - needs profile for applying

## Success Criteria

1. Can apply to job with cover letter
2. Can select different resume
3. Application appears in my applications
4. Status tracker shows current status
5. Can view application details
6. Can withdraw pending applications
7. Duplicate application prevented
8. Profile incomplete prevents applying
9. Notifications sent on status change

## Related Issues

- #3 (API Foundation) - prerequisite
- #4 (Job Search) - uses apply button
- #5 (Profile & CV) - needs complete profile
- #8 (Application Management - Employer) - complementary feature
- #13 (Notification System) - status change notifications
