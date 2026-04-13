# Issue #8: Application Management

## Metadata
- **Issue Number:** #8
- **Labels:** `app/employer`, `type/feature`, `priority/high`, `size/m`
- **Assignee:** Dev 3 (Employer App Lead)
- **Milestone:** M3 - Employer MVP
- **Epic:** Employer Features
- **Estimate:** 12-14h

## Problem Statement

Employers need to view, filter, and manage applications for their job postings. This includes reviewing candidate profiles, updating application status, and organizing candidates through the hiring funnel.

## Requirements

### 1. Applications List

Route: `/applications`

**Features:**
- Filter by job posting
- Filter by status
- Search by candidate name
- Sort by date (newest first)
- Bulk actions

### 2. Application Kanban/Funnel View

Visual hiring funnel:
```
[All] → [Pending] → [Viewed] → [Shortlisted] → [Interview] → [Offered]
 50      20          15        10              5            2
                            → [Rejected]
```

Drag-and-drop to change status.

### 3. Application Card

```
┌─────────────────────────────────────────────────┐
│ 👤 John Doe                                     │
│ Senior Software Engineer                        │
│ 📍 Ho Chi Minh City  |  5 years exp.           │
│                                                 │
│ Applied: Jan 15, 2026  |  Status: 🟡 Pending   │
│                                                 │
│ [View Profile] [Shortlist] [Reject] [Message]  │
└─────────────────────────────────────────────────┘
```

### 4. Application Detail Modal/Page

Route: `/applications/$applicationId`

**Sections:**

1. **Header**
   - Candidate name and avatar
   - Current status
   - Apply date

2. **Quick Actions**
   - Change status dropdown
   - Schedule interview button
   - Send message button
   - Download resume button

3. **Candidate Info Tabs**
   - Profile Overview
   - Full Resume
   - Application Details
   - Notes
   - Activity History

4. **Employer Notes**
   - Private notes (not visible to candidate)
   - Rating (1-5 stars)
   - Tags/labels

### 5. Status Update Workflow

```
Pending → Viewed → Shortlisted → Interview → Offered
   ↓        ↓          ↓            ↓
Rejected  Rejected   Rejected    Rejected
```

- All transitions require confirmation
- Status change triggers notification to candidate
- Activity logged in history

### 6. Bulk Actions

- Select multiple applications
- Bulk status change
- Bulk reject
- Bulk export (CSV)

## Tasks Checklist

```markdown
- [ ] 1. Create applications list route
- [ ] 2. Create application card component
- [ ] 3. Create application detail view
- [ ] 4. Create status change workflow
- [ ] 5. Create Kanban board view
- [ ] 6. Implement drag-and-drop
- [ ] 7. Create employer notes feature
- [ ] 8. Create bulk actions
- [ ] 9. Add application search
- [ ] 10. Add application filters
- [ ] 11. Create activity timeline
- [ ] 12. Add candidate rating
```

## Files to Create

```
apps/employer/src/
├── routes/
│   ├── applications.tsx          # Applications list
│   └── applications.$id.tsx     # Application detail
├── components/
│   ├── application/
│   │   ├── application-card.tsx
│   │   ├── application-detail.tsx
│   │   ├── application-status-select.tsx
│   │   ├── application-notes.tsx
│   │   ├── application-activity.tsx
│   │   ├── application-kanban.tsx
│   │   ├── bulk-actions.tsx
│   │   └── candidate-preview.tsx
```

## Files to Modify

```
apps/employer/src/routes/my-jobs.$jobId.tsx  # Add applications link
apps/employer/src/components/sidebar.tsx
apps/employer/src/components/header.tsx
```

## API Endpoints Needed

```typescript
// applications.ts router
applications.listForEmployer: employerProcedure
  .input(listEmployerApplicationsSchema.optional())
  .query(...)

applications.getById: employerProcedure
  .input(z.object({ id: z.string() }))
  .query(...)

applications.updateStatus: employerProcedure
  .input(z.object({ 
    id: z.string(), 
    status: applicationStatusSchema 
  }))
  .mutation(...)

applications.addNote: employerProcedure
  .input(z.object({ 
    applicationId: z.string(),
    note: z.string()
  }))
  .mutation(...)

applications.bulkUpdateStatus: employerProcedure
  .input(z.object({ 
    ids: z.array(z.string()),
    status: applicationStatusSchema 
  }))
  .mutation(...)

applications.exportCsv: employerProcedure
  .input(z.object({ jobId: z.string().optional() }))
  .mutation(...) // Returns download URL
```

## Design Notes

### Status Colors (Employer View)
| Status | Color | Description |
|--------|-------|-------------|
| PENDING | `--muted` | New, unread |
| VIEWED | `--primary` | Read but not actioned |
| SHORTLISTED | `--success` | Good fit |
| INTERVIEW | `--warning` | In interview process |
| OFFERED | `--success` (bright) | Offer extended |
| REJECTED | `--destructive` | Not proceeding |
| WITHDRAWN | `--muted` | Candidate withdrew |

### Quick Actions Bar
```
┌────────────────────────────────────────────────────────────┐
│ [View Profile] [Shortlist ▼] [Schedule Interview] [Reject]│
│                            └─ [Mark Viewed]                 │
└────────────────────────────────────────────────────────────┘
```

## Dependencies

- **Blocked By:** 
  - #3 (API Foundation) - need application APIs
  - #6 (Application Flow - Candidate) - provides applications

## Success Criteria

1. Can view all applications
2. Can filter by job and status
3. Can change application status
4. Status changes notify candidates
5. Can add private notes
6. Kanban view functional
7. Bulk actions work
8. Activity history logged
9. Candidate profile viewable

## Related Issues

- #6 (Application Flow - Candidate) - submits applications
- #9 (Messaging) - communicate with candidates
- #13 (Notification System) - status change notifications
