# Issue #12: Job & Content Moderation

## Metadata
- **Issue Number:** #12
- **Labels:** `app/admin`, `type/feature`, `priority/medium`, `size/m`
- **Assignee:** Dev 4 (Admin & Infrastructure Lead)
- **Milestone:** M4 - Admin MVP
- **Epic:** Admin Features
- **Estimate:** 8-10h

## Problem Statement

Admin needs tools to moderate job postings and reported content to ensure quality and compliance with platform policies.

## Requirements

### 1. Pending Jobs Queue

Route: `/admin/jobs/pending`

**Features:**
- List of jobs pending approval
- Preview job details
- Approve job
- Reject job with reason
- Request changes

### 2. Flagged Content

Route: `/admin/reports`

**Report Types:**
- Inappropriate job posting
- Spam
- Scam/fraud
- Duplicate posting
- Other

**Features:**
- List of reported content
- Report details
- Content preview
- Reporter information
- Take action (remove, warn, ban)

### 3. Moderation Actions

| Action | Description |
|--------|-------------|
| Approve | Job is approved and published |
| Reject | Job is rejected with reason |
| Request Changes | Return to employer with feedback |
| Remove Content | Remove reported content |
| Warn User | Send warning to content creator |
| Ban User | Ban user from posting |
| Dismiss Report | Report is not valid |

### 4. Moderation History

- Log all moderation actions
- Include moderator ID
- Include timestamp
- Include reason/rejection

### 5. Automated Filters (Optional)

- Keyword filter for inappropriate content
- Duplicate detection
- Spam detection

## Tasks Checklist

```markdown
- [ ] 1. Create pending jobs queue
- [ ] 2. Create job review interface
- [ ] 3. Create approve/reject workflow
- [ ] 4. Create reports list
- [ ] 5. Create report detail view
- [ ] 6. Create moderation actions
- [ ] 7. Create moderation history
- [ ] 8. Create rejection reason form
- [ ] 9. Add report submission (users can flag)
- [ ] 10. Create warning system
```

## Files to Create

```
apps/admin/src/
├── routes/
│   ├── admin.jobs.pending.tsx   # Pending jobs
│   └── admin.reports.tsx        # Reported content
├── components/
│   ├── admin/
│   │   ├── pending-jobs-list.tsx
│   │   ├── job-review-panel.tsx
│   │   ├── job-moderation-actions.tsx
│   │   ├── rejection-form.tsx
│   │   ├── reports-list.tsx
│   │   ├── report-detail.tsx
│   │   ├── moderation-history.tsx
│   │   └── report-submit-button.tsx  # For employers/candidates
```

## Files to Modify

```
apps/admin/src/components/admin-sidebar.tsx  # Add Jobs & Reports links
```

## API Endpoints Needed

```typescript
// moderation.ts router
moderation.listPendingJobs: adminProcedure
  .input(z.object({ page: z.number().default(1) }))
  .query(...)

moderation.approveJob: adminProcedure
  .input(z.object({ jobId: z.string() }))
  .mutation(...)

moderation.rejectJob: adminProcedure
  .input(z.object({ 
    jobId: z.string(),
    reason: z.string()
  }))
  .mutation(...)

moderation.requestChanges: adminProcedure
  .input(z.object({ 
    jobId: z.string(),
    feedback: z.string()
  }))
  .mutation(...)

// Reports
moderation.listReports: adminProcedure
  .input(z.object({ 
    type: reportTypeSchema.optional(),
    status: z.enum(['PENDING', 'RESOLVED']).optional()
  }))
  .query(...)

moderation.getReport: adminProcedure
  .input(z.object({ id: z.string() }))
  .query(...)

moderation.resolveReport: adminProcedure
  .input(z.object({ 
    id: z.string(),
    action: moderationActionSchema,
    notes: z.string().optional()
  }))
  .mutation(...)

// Report from users (public)
reports.create: protectedProcedure
  .input(z.object({
    contentType: z.enum(['job', 'user', 'message']),
    contentId: z.string(),
    reason: reportTypeSchema,
    description: z.string().optional()
  }))
  .mutation(...)
```

## Design Notes

### Pending Job Card
```
┌─────────────────────────────────────────────────┐
│ 🚨 Pending Approval                             │
│                                                 │
│ Senior Developer - Tech Corp                    │
│ Posted by: employer@techcorp.com               │
│ Posted: Jan 15, 2026                           │
│                                                 │
│ Reason: First job from this employer           │
│                                                 │
│ [Preview] [Approve] [Reject] [Request Changes] │
└─────────────────────────────────────────────────┘
```

### Report Card
```
┌─────────────────────────────────────────────────┐
│ ⚠️ Inappropriate Content                        │
│                                                 │
│ Job: "Work from home - no experience needed"   │
│ Reported by: john@example.com (Jan 14, 2026)   │
│                                                 │
│ Reason: Spam                                    │
│ Description: This job posting looks like...     │
│                                                 │
│ [View Content] [Remove] [Dismiss] [Warn User]   │
└─────────────────────────────────────────────────┘
```

## Dependencies

- **Blocked By:** 
  - #3 (API Foundation) - basic APIs

## Success Criteria

1. Can view pending jobs queue
2. Can preview job before decision
3. Can approve jobs
4. Can reject jobs with reason
5. Can request changes
6. Can view and manage reports
7. Moderation history logged
8. Users can submit reports
9. Notifications sent to affected users

## Related Issues

- #7 (Job Posting) - jobs go through moderation
- #13 (Notification System) - moderation notifications
