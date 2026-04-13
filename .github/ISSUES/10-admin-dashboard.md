# Issue #10: Admin Dashboard Overview

## Metadata
- **Issue Number:** #10
- **Labels:** `app/admin`, `type/feature`, `priority/high`, `size/m`
- **Assignee:** Dev 4 (Admin & Infrastructure Lead)
- **Milestone:** M4 - Admin MVP
- **Epic:** Admin Features
- **Estimate:** 8-10h

## Problem Statement

Create the admin dashboard with key metrics, statistics, and quick actions for platform administrators to monitor the health and activity of the job board platform.

## Requirements

### 1. Dashboard Overview

Route: `/admin`

**Statistics Cards:**

| Metric | Description |
|--------|-------------|
| Total Users | All registered users |
| Total Candidates | Users with CANDIDATE role |
| Total Employers | Users with EMPLOYER role |
| Active Jobs | Jobs with OPEN status |
| Total Applications | All applications |
| New This Week | Users registered this week |

**Charts:**
- User growth (line chart)
- Job postings trend (bar chart)
- Application funnel (funnel visualization)

**Activity Feed:**
- Recent registrations
- Recent job postings
- Recent applications
- Flagged content

### 2. Quick Actions

| Action | Description |
|--------|-------------|
| View All Users | Navigate to user management |
| View Pending Jobs | Navigate to job moderation |
| View Reports | Navigate to reported content |
| Platform Settings | Navigate to settings |

### 3. Admin Navigation

Sidebar with sections:
- Dashboard (current)
- Users
- Jobs
- Organizations
- Applications
- Reports
- Settings

## Tasks Checklist

```markdown
- [ ] 1. Create admin layout with sidebar
- [ ] 2. Create dashboard stats cards
- [ ] 3. Create user growth chart
- [ ] 4. Create job postings chart
- [ ] 5. Create application funnel
- [ ] 6. Create activity feed
- [ ] 7. Create quick actions panel
- [ ] 8. Add date range selector
- [ ] 9. Implement responsive design
- [ ] 10. Add loading states
```

## Files to Create

```
apps/admin/src/
├── routes/
│   ├── admin.tsx              # Dashboard layout
│   └── admin.index.tsx       # Dashboard home
├── components/
│   ├── admin/
│   │   ├── admin-sidebar.tsx
│   │   ├── stats-card.tsx
│   │   ├── user-growth-chart.tsx
│   │   ├── job-trend-chart.tsx
│   │   ├── application-funnel.tsx
│   │   ├── activity-feed.tsx
│   │   └── quick-actions.tsx
```

## Files to Modify

```
apps/admin/src/routes/__root.tsx  # Update layout
apps/admin/src/components/sidebar.tsx  # Add admin nav
```

## API Endpoints Needed

```typescript
// analytics.ts router
analytics.dashboardStats: adminProcedure.query(...)
analytics.userGrowth: adminProcedure
  .input(z.object({ period: z.enum(['7d', '30d', '90d', '1y']) }))
  .query(...)
analytics.jobTrend: adminProcedure
  .input(z.object({ period: z.enum(['7d', '30d', '90d', '1y']) }))
  .query(...)
analytics.recentActivity: adminProcedure.query(...)
```

## Design Notes

### Stats Card
```
┌────────────────────────────────┐
│ 📊                             │
│ Total Users                     │
│                                │
│ 12,450                         │
│  ↑ 12% from last week          │
└────────────────────────────────┘
```

### Activity Feed Item
```
● John Doe registered as Candidate
  2 minutes ago

● Tech Corp posted "Senior Developer"
  5 minutes ago
```

## Dependencies

- **Blocked By:** 
  - #3 (API Foundation) - basic APIs
  - #14 (Analytics) - will extend this

## Success Criteria

1. Dashboard loads with current stats
2. Charts display correctly
3. Activity feed shows recent items
4. Quick actions navigate properly
5. Date range filter works
6. Responsive on tablet/desktop
7. Loading states shown

## Related Issues

- #11 (User Management) - extends user section
- #12 (Content Moderation) - extends moderation
- #14 (Analytics) - extends dashboard
