# Issue #7: Job Posting Management

## Metadata
- **Issue Number:** #7
- **Labels:** `app/employer`, `type/feature`, `priority/high`, `size/l`
- **Assignee:** Dev 3 (Employer App Lead)
- **Milestone:** M3 - Employer MVP
- **Epic:** Employer Features
- **Estimate:** 16-20h

## Problem Statement

Employers need to create, edit, and manage job postings. This includes a multi-step job creation form, job management dashboard, and draft saving functionality.

## Requirements

### 1. Create Job Route

Route: `/jobs/new`

**Multi-Step Form:**

#### Step 1: Basic Information
- Job Title (required)
- Job Type: Full-time, Part-time, Contract, Internship, Freelance
- Work Type: Remote, Hybrid, Onsite
- Experience Level: Entry, Junior, Mid, Senior, Lead, Executive
- Location (required)

#### Step 2: Job Details
- Description (rich text editor)
- Requirements
- Benefits
- Required Skills (tag input)

#### Step 3: Salary & Conditions
- Salary Min/Max
- Salary Type: Hourly, Monthly, Yearly
- Salary Negotiable (toggle)
- Working Hours
- Number of Positions

#### Step 4: Additional Info
- Application Deadline
- Questions for Candidates (custom questions)
- Job Tags/Categories

#### Step 5: Preview & Publish
- Preview as candidates will see
- Save as Draft or Publish

### 2. Job Management Dashboard

Route: `/my-jobs`

**Features:**
- List of all posted jobs
- Status indicators (Draft, Open, Closed)
- Quick actions (Edit, Clone, Close)
- Statistics per job (views, applications)
- Filter by status

**Job Card:**
```
┌─────────────────────────────────────────────────┐
│ Senior React Developer                         │
│ Status: 🟢 Open    Posted: Jan 10, 2026       │
│                                                 │
│ 📊 245 views  |  📥 18 applications             │
│                                                 │
│ [View] [Edit] [Clone] [Close]                  │
└─────────────────────────────────────────────────┘
```

### 3. Edit Job

Route: `/my-jobs/$jobId/edit`

Same form as create, pre-filled with existing data.

### 4. Job Templates

- Save job as template
- Use template for new job
- Manage saved templates

### 5. Draft Auto-Save

- Auto-save every 30 seconds
- Manual save button
- Draft indicator
- Resume editing from draft

## Tasks Checklist

```markdown
- [ ] 1. Create job creation multi-step form
- [ ] 2. Create job form step components
- [ ] 3. Integrate rich text editor (TipTap)
- [ ] 4. Create job management dashboard
- [ ] 5. Create job card component
- [ ] 6. Create edit job page
- [ ] 7. Implement draft auto-save
- [ ] 8. Add job cloning feature
- [ ] 9. Create job templates
- [ ] 10. Add job statistics display
- [ ] 11. Add job closing functionality
- [ ] 12. Preview as candidate view
```

## Files to Create

```
apps/employer/src/
├── routes/
│   ├── jobs.new.tsx           # Create job
│   ├── my-jobs.index.tsx           # Job dashboard
│   └── my-jobs.$jobId.edit.tsx  # Edit job
├── components/
│   ├── job/
│   │   ├── job-form.tsx
│   │   ├── job-form-step-1.tsx
│   │   ├── job-form-step-2.tsx
│   │   ├── job-form-step-3.tsx
│   │   ├── job-form-step-4.tsx
│   │   ├── job-form-step-5.tsx
│   │   ├── job-card-admin.tsx
│   │   ├── job-stats.tsx
│   │   └── job-preview.tsx
```

## Files to Modify

```
apps/employer/src/routes/__root.tsx
apps/employer/src/components/sidebar.tsx
apps/employer/src/components/header.tsx
```

## API Endpoints Needed

```typescript
// jobs.ts router
jobs.create: employerProcedure.input(jobCreateSchema).mutation(...)
jobs.update: employerProcedure.input(jobUpdateSchema).mutation(...)
jobs.delete: employerProcedure.input(z.object({ id: z.string() })).mutation(...)
jobs.listMyJobs: employerProcedure.query(...)
jobs.getById: employerProcedure.input(z.object({ id: z.string() })).query(...)
jobs.clone: employerProcedure.input(z.object({ id: z.string() })).mutation(...)
jobs.changeStatus: employerProcedure.input(z.object({ 
  id: z.string(), 
  status: jobStatusSchema 
})).mutation(...)

// templates router
templates.save: employerProcedure.input(z.object({ jobId: z.string() })).mutation(...)
templates.list: employerProcedure.query(...)
templates.delete: employerProcedure.input(z.object({ id: z.string() })).mutation(...)
```

## Design Notes

### Step Progress Indicator
```
[●1]───[●2]───[○3]───[○4]───[○5]
Basic   Details  Salary  Extra  Review
```

### Rich Text Editor Requirements
- Bold, italic, underline
- Bullet lists, numbered lists
- Headings (H2, H3)
- Links
- Code blocks (for technical jobs)
- Character count

## Dependencies

- **Blocked By:** 
  - #3 (API Foundation) - need organization and jobs API
  - Rich text editor setup

## Success Criteria

1. Multi-step form works smoothly
2. Form validates all required fields
3. Rich text editor functional
4. Drafts auto-save correctly
5. Jobs can be created, edited, cloned
6. Job statistics display correctly
7. Job status changes work
8. Preview matches final display

## Related Issues

- #3 (API Foundation) - prerequisite
- #8 (Application Management) - receives applications
- #9 (Messaging) - communicate with candidates
