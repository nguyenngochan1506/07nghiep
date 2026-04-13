# Issue #14: Analytics Dashboard

## Metadata
- **Issue Number:** #14
- **Labels:** `app/admin`, `app/employer`, `type/feature`, `priority/medium`, `size/m`
- **Assignee:** Dev 4 (Admin & Infrastructure Lead)
- **Milestone:** M5 - Polish
- **Epic:** Analytics
- **Estimate:** 10-12h

## Problem Statement

Build analytics dashboards for both platform administrators and employers to gain insights into platform activity, user growth, and job performance.

## Requirements

### 1. Admin Analytics Dashboard

Route: `/admin/analytics`

**Metrics:**

| Metric | Description |
|--------|-------------|
| Total Users | Cumulative user count |
| Active Users (30d) | Users who logged in 30 days |
| Total Jobs | All job postings |
| Active Jobs | Currently open jobs |
| Total Applications | All applications |
| Conversion Rate | Applications per job |

**Charts:**

1. **User Growth Chart**
   - Line chart
   - New registrations over time
   - Grouped by role (candidates/employers)

2. **Job Posting Trends**
   - Bar chart
   - Jobs posted per week/month
   - Filter by industry

3. **Application Funnel**
   - Funnel visualization
   - Applied → Viewed → Shortlisted → Interviewed → Hired

4. **Top Industries**
   - Pie/bar chart
   - Jobs by industry

5. **Geographic Distribution**
   - Map or bar chart
   - Jobs/Users by location

**Date Range Picker:**
- Last 7 days
- Last 30 days
- Last 90 days
- Last year
- Custom range

### 2. Employer Analytics Dashboard

Route: `/employer/analytics`

**Metrics per Employer:**

| Metric | Description |
|--------|-------------|
| Total Jobs Posted | All jobs by this employer |
| Active Jobs | Currently open |
| Total Views | Views across all jobs |
| Total Applications | Applications across all jobs |
| Avg. Applications/Job | Efficiency metric |
| Response Rate | Viewed/Applied ratio |

**Charts:**

1. **Job Views Over Time**
   - Line chart
   - Total views per day/week

2. **Application Rate**
   - Line chart
   - Applications received over time

3. **Source Breakdown**
   - Pie chart
   - Where candidates come from (search, direct, referral)

4. **Job Performance Comparison**
   - Bar chart
   - Views and applications per job

5. **Hiring Funnel**
   - Funnel per job
   - Applied → Viewed → Shortlisted → Interviewed → Offered

### 3. Export Reports

- Export to CSV
- Export to PDF (optional)
- Scheduled reports (email) (optional)

### 4. Chart Components

Reusable chart components:
```typescript
interface ChartProps {
  data: ChartData;
  title?: string;
  subtitle?: string;
  dateRange: DateRange;
  onRangeChange?: (range: DateRange) => void;
}
```

Charts to implement:
- LineChart
- BarChart
- PieChart
- FunnelChart
- AreaChart
- DataTable

## Tasks Checklist

```markdown
- [ ] 1. Create analytics API for admin
- [ ] 2. Create analytics API for employer
- [ ] 3. Create admin analytics dashboard
- [ ] 4. Create employer analytics dashboard
- [ ] 5. Implement user growth chart
- [ ] 6. Implement job trends chart
- [ ] 7. Implement application funnel
- [ ] 8. Implement job performance chart
- [ ] 9. Create date range picker
- [ ] 10. Implement export to CSV
- [ ] 11. Create reusable chart components
- [ ] 12. Add loading states
```

## Files to Create/Modify

### Backend
```
packages/api/src/
├── routers/
│   ├── admin-analytics.ts
│   └── employer-analytics.ts
apps/server/src/
├── services/
│   └── analytics.service.ts
```

### Frontend (Admin)
```
apps/admin/src/
├── routes/
│   └── admin.analytics.tsx
├── components/
│   ├── admin/
│   │   ├── analytics/
│   │   │   ├── overview-cards.tsx
│   │   │   ├── user-growth-chart.tsx
│   │   │   ├── job-trends-chart.tsx
│   │   │   ├── application-funnel-chart.tsx
│   │   │   ├── top-industries-chart.tsx
│   │   │   └── date-range-picker.tsx
```

### Frontend (Employer)
```
apps/employer/src/
├── routes/
│   └── analytics.tsx
├── components/
│   ├── analytics/
│   │   ├── employer-stats.tsx
│   │   ├── job-performance-chart.tsx
│   │   ├── application-rate-chart.tsx
│   │   └── source-breakdown-chart.tsx
```

### Shared Components
```
packages/ui/src/components/
├── charts/
│   ├── line-chart.tsx
│   ├── bar-chart.tsx
│   ├── pie-chart.tsx
│   ├── funnel-chart.tsx
│   └── data-table.tsx
```

## API Endpoints

```typescript
// Admin Analytics
analytics.admin.overview: adminProcedure.query(...)
analytics.admin.userGrowth: adminProcedure
  .input(z.object({ period: dateRangeSchema }))
  .query(...)
analytics.admin.jobTrends: adminProcedure
  .input(z.object({ period: dateRangeSchema }))
  .query(...)
analytics.admin.applicationFunnel: adminProcedure
  .input(z.object({ period: dateRangeSchema }))
  .query(...)
analytics.admin.topIndustries: adminProcedure.query(...)
analytics.admin.exportReport: adminProcedure
  .input(z.object({ type: reportTypeSchema, period: dateRangeSchema }))
  .mutation(...)

// Employer Analytics
analytics.employer.overview: employerProcedure.query(...)
analytics.employer.jobPerformance: employerProcedure
  .input(z.object({ jobId: z.string().optional() }))
  .query(...)
analytics.employer.viewsOverTime: employerProcedure
  .input(z.object({ jobId: z.string().optional(), period: dateRangeSchema }))
  .query(...)
analytics.employer.applicationsOverTime: employerProcedure
  .input(z.object({ jobId: z.string().optional(), period: dateRangeSchema }))
  .query(...)
```

## Design Notes

### Overview Cards
```
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Total Users    │ │ Active Jobs    │ │ Applications    │
│                │ │                │ │                │
│ 12,450         │ │ 1,234          │ │ 8,901          │
│ ↑ 5.2%         │ │ ↑ 3.1%         │ │ ↑ 12.4%        │
│ vs last month  │ │ vs last month  │ │ vs last month  │
└────────────────┘ └────────────────┘ └────────────────┘
```

### Funnel Chart
```
         ┌─────────────────────┐
         │      Applied       │
         │       500          │
         └──────────┬──────────┘
                    │ 60%
         ┌──────────┴──────────┐
         │      Viewed        │
         │       300          │
         └──────────┬──────────┘
                    │ 33%
         ┌──────────┴──────────┐
         │    Shortlisted     │
         │       100          │
         └──────────┬──────────┘
                    │ 50%
         ┌──────────┴──────────┐
         │    Interviewed     │
         │        50          │
         └──────────┬──────────┘
                    │ 40%
         ┌──────────┴──────────┐
         │      Hired          │
         │        20          │
         └─────────────────────┘
```

## Dependencies

- **Blocked By:** 
  - #3 (API Foundation) - basic APIs
  - Chart library setup (Recharts, Chart.js, or Tremor)

## Chart Library Recommendation

Use **Tremor** or **Recharts** for React:

```bash
npm install @tremor/react recharts
```

## Success Criteria

1. Admin can view platform analytics
2. Employer can view their job analytics
3. Charts display correctly with real data
4. Date range picker works
5. Export to CSV works
6. Responsive on desktop
7. Loading states shown
8. Real-time updates (optional)

## Related Issues

- #10 (Admin Dashboard) - extends admin dashboard
- #7 (Job Posting) - provides job data
- #8 (Application Management) - provides application data
