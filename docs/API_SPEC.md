# 07nghiep API Specification

## Overview

- **Base URL**: `http://localhost:3000`
- **API Type**: tRPC (TypeScript Remote Procedure Call)
- **Protocol**: HTTP/JSON over tRPC
- **Transport**: `httpBatchLink` for batching, WebSocket (planned) for realtime
- **tRPC Endpoint**: `/trpc`

## Authentication

All authenticated endpoints require a session cookie set by Better Auth.

```
Cookie: better-auth.session_token=<token>
```

## Role-Based Access Control

| Role | Description |
|------|-------------|
| `CANDIDATE` | Job seeker user |
| `EMPLOYER` | Company/recruiter user |
| `ADMIN` | Platform administrator |

## Error Format

All errors follow tRPC's standard error format:

```typescript
{
  "error": {
    "message": "Human-readable error message",
    "code": "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR",
    "cause": "Optional additional context"
  }
}
```

## Pagination

List endpoints use cursor-based or offset pagination:

```typescript
// Offset pagination
{
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Cursor-based pagination (for realtime/large lists)
{
  items: T[];
  nextCursor?: string;
}
```

---

## Authentication Endpoints (Better Auth Built-in)

Provided by Better Auth at `/api/auth/*`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/sign-up` | Register new user |
| POST | `/api/auth/sign-in` | Sign in with email/password |
| POST | `/api/auth/sign-out` | Sign out |
| GET | `/api/auth/session` | Get current session |
| POST | `/api/auth/verification` | Send verification email |
| POST | `/api/auth/otp/send` | Send OTP code |
| POST | `/api/auth/otp/verify` | Verify OTP code |

---

## API Reference

### Table of Contents

1. [Health](#1-health)
2. [User](#2-user)
3. [Profile](#3-profile)
4. [Organization](#4-organization)
5. [Jobs](#5-jobs) — Planned
6. [Applications](#6-applications) — Planned
7. [Saved Jobs](#7-saved-jobs) — Planned
8. [Conversations](#8-conversations) — Planned
9. [Messages](#9-messages) — Planned
10. [Notifications](#10-notifications) — Planned

---

## 1. Health

### `healthCheck`

Ping the API server.

**Procedure**: `publicProcedure.query()`

**Response**

```json
"OK"
```

---

## 2. User

Base path: `trpc/user.*`

### `user.getMe`

Get the currently authenticated user's profile.

**Procedure**: `protectedProcedure.query()`

**Response**

```typescript
{
  id: string;
  name: string;
  email: string;
  image?: string;
  emailVerified: boolean;
  createdAt: Date;
  role: "CANDIDATE" | "EMPLOYER" | "ADMIN";
}
```

---

### `user.updateMe`

Update the authenticated user's basic info.

**Procedure**: `protectedProcedure.mutation()`

**Input**

```typescript
{
  name?: string;       // 1-100 chars
  image?: string;       // Valid URL
}
```

**Response**

Returns the updated user object (same as `getMe`).

---

### `user.getById`

Get a user's public profile by ID.

**Procedure**: `publicProcedure.query()`

**Input**

```typescript
{
  id: string;  // User ID (required)
}
```

**Response**

```typescript
{
  id: string;
  name: string;
  email: string;
  image?: string;
  emailVerified: boolean;
  createdAt: Date;
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `NOT_FOUND` | User does not exist |

---

## 3. Profile

Base path: `trpc/profile.*`

### `profile.getMyProfile`

Get the authenticated candidate's profile.

**Procedure**: `candidateProcedure.query()`

**Response**

```typescript
{
  id: string;
  userId: string;
  headline?: string;           // max 200
  summary?: string;            // max 2000
  skills: string[];            // max 50
  experience?: Experience[];   // max 20
  education?: Education[];     // max 10
  resumeUrl?: string;
  portfolioUrl?: string;
  location?: string;           // max 100
  phone?: string;              // max 20
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

```typescript
type Experience = {
  title: string;              // 1-100
  company: string;            // 1-100
  location?: string;          // max 100
  startDate: string;          // YYYY-MM
  endDate?: string;          // YYYY-MM
  current: boolean;
  description?: string;       // max 1000
};

type Education = {
  degree: string;             // 1-100
  school: string;             // 1-100
  location?: string;          // max 100
  startYear: number;          // 1950-2030
  endYear?: number;           // 1950-2030
};
```

**Errors**

| Code | Condition |
|------|-----------|
| `UNAUTHORIZED` | User is not a candidate |
| `NOT_FOUND` | Profile does not exist |

---

### `profile.updateMyProfile`

Create or update the authenticated candidate's profile.

**Procedure**: `candidateProcedure.mutation()`

**Input**

```typescript
{
  headline?: string;           // max 200
  summary?: string;            // max 2000
  skills?: string[];           // max 50
  experience?: Experience[];
  education?: Education[];
  location?: string;           // max 100
  phone?: string;             // max 20
  portfolioUrl?: string;       // Valid URL
  avatarUrl?: string;          // Valid URL
}
```

**Response**

Returns the created or updated profile object.

**Notes**

- Uses upsert — creates profile if not exists, updates if exists.
- `experience` and `education` are stored as JSON in PostgreSQL.

---

### `profile.getPublicProfile`

Get a candidate's public profile by user ID.

**Procedure**: `publicProcedure.query()`

**Input**

```typescript
{
  userId: string;  // User ID (required)
}
```

**Response**

Same as `getMyProfile`.

**Errors**

| Code | Condition |
|------|-----------|
| `NOT_FOUND` | Profile does not exist |

---

### `profile.uploadResume`

Generate a presigned URL for resume upload to R2.

**Procedure**: `candidateProcedure.mutation()`

**Input**

```typescript
{
  filename: string;    // Required, non-empty
  contentType: string;  // Required, must be "application/pdf"
}
```

**Response**

```typescript
{
  uploadUrl: string;   // Presigned PUT URL, expires in 15 min
  publicUrl: string;   // Final public URL after upload
  key: string;         // R2 object key
  expiresIn: number;   // TTL in seconds (900)
}
```

**Errors**
- `UNAUTHORIZED` — Not authenticated as candidate
- `INTERNAL_SERVER_ERROR` — R2 not configured
- `BAD_REQUEST` — Invalid content type

**Status**: ✅ Implemented with R2

---

### `profile.uploadAvatar`

Generate a presigned URL for avatar image upload to R2.

**Procedure**: `candidateProcedure.mutation()`

**Input**

```typescript
{
  filename: string;    // Required, non-empty
  contentType: string; // Required, must be image/jpeg|png|webp
}
```

**Response**

```typescript
{
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}
```

**Status**: ✅ Implemented with R2

---

## 4. Organization

Base path: `trpc/organization.*`

### `organization.getMyOrganization`

Get the authenticated employer's organization.

**Procedure**: `employerProcedure.query()`

**Response**

```typescript
{
  id: string;
  userId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  companySize?: "STARTUP" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";
  foundedYear?: number;
  location?: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `UNAUTHORIZED` | User is not an employer |
| `NOT_FOUND` | Organization does not exist |

---

### `organization.create`

Create an organization for the authenticated employer.

**Procedure**: `employerProcedure.mutation()`

**Input**

```typescript
{
  name: string;               // 2-200 chars (required)
  description?: string;        // max 5000
  website?: string;           // Valid URL
  industry?: string;          // max 100
  companySize?: "STARTUP" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";
  foundedYear?: number;       // 1800-2030
  location?: string;          // max 200
  logoUrl?: string;           // Valid URL
}
```

**Response**

Returns the created organization object.

**Errors**

| Code | Condition |
|------|-----------|
| `UNAUTHORIZED` | User is not an employer |
| `CONFLICT` | Organization already exists for this user |

---

### `organization.update`

Update the authenticated employer's organization.

**Procedure**: `employerProcedure.mutation()`

**Input**

Same as `organization.create` — all fields are optional (partial update).

**Response**

Returns the updated organization object.

**Errors**

| Code | Condition |
|------|-----------|
| `UNAUTHORIZED` | User is not an employer |
| `NOT_FOUND` | Organization does not exist |

---

### `organization.getById`

Get an organization's public profile by ID.

**Procedure**: `publicProcedure.query()`

**Input**

```typescript
{
  id: string;  // Organization ID (required)
}
```

**Response**

```typescript
{
  id: string;
  userId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  companySize?: "STARTUP" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";
  foundedYear?: number;
  location?: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
  openJobsCount: number;  // Number of OPEN jobs
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `NOT_FOUND` | Organization does not exist |

---

### `organization.getJobs`

Get paginated job listings for an organization.

**Procedure**: `publicProcedure.query()`

**Input**

```typescript
{
  organizationId: string;   // Organization ID (required)
  status?: "OPEN" | "CLOSED";  // Filter by job status
  page?: number;            // Default: 1, min: 1
  pageSize?: number;        // Default: 10, min: 1, max: 50
}
```

**Response**

```typescript
{
  jobs: JobSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

type JobSummary = {
  id: string;
  title: string;
  location: string;
  workType: "REMOTE" | "HYBRID" | "ONSITE";
  jobType: "FULLTIME" | "PARTIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: "HOURLY" | "MONTHLY" | "YEARLY";
  salaryNegotiable: boolean;
  status: "DRAFT" | "PENDING_APPROVAL" | "OPEN" | "CLOSED" | "ARCHIVED";
  publishedAt?: Date;
  expiresAt?: Date;
  applicationsCount: number;
  createdAt: Date;
};
```

---

### `organization.requestVerification`

Request organization verification (marks as unverified).

**Procedure**: `employerProcedure.mutation()`

**Response**

Returns the updated organization object with `verified: false`.

**Status**: Placeholder — admin review workflow not implemented.

---

## 5. Jobs

**Status**: Not implemented yet. Planned for `apps/server/src/routers/jobs.ts`.

### Planned Endpoints

```typescript
// jobs.list
// List all open jobs with filters
// Procedure: publicProcedure.query()
{
  search?: string;
  location?: string;
  workType?: "REMOTE" | "HYBRID" | "ONSITE";
  jobType?: "FULLTIME" | "PARTIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
  experienceLevel?: "ENTRY" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "EXECUTIVE";
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  page?: number;
  pageSize?: number;
}

// jobs.getById
// Procedure: publicProcedure.query()
{ id: string }

// jobs.incrementView
// Increment job view count
// Procedure: publicProcedure.mutation()
{ id: string }

// jobs.create
// Create a new job posting
// Procedure: employerProcedure.mutation()
{
  title: string;
  description: string;
  requirements?: string;
  benefits?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: "HOURLY" | "MONTHLY" | "YEARLY";
  salaryNegotiable?: boolean;
  location: string;
  workType: "REMOTE" | "HYBRID" | "ONSITE";
  jobType: "FULLTIME" | "PARTIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
  experienceLevel?: "ENTRY" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "EXECUTIVE";
  expiresAt?: Date;
  skills?: string[];
}

// jobs.update
// Procedure: employerProcedure.mutation()
{
  id: string;
  // ... same fields as create (all optional)
}

// jobs.delete
// Procedure: employerProcedure.mutation()
{ id: string }

// jobs.listMyJobs
// List jobs posted by the authenticated employer
// Procedure: employerProcedure.query()
{ status?: "DRAFT" | "OPEN" | "CLOSED"; page?: number; pageSize?: number }

// jobs.changeStatus
// Procedure: employerProcedure.mutation()
{
  id: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "OPEN" | "CLOSED" | "ARCHIVED";
}

// jobs.clone
// Clone an existing job as draft
// Procedure: employerProcedure.mutation()
{ id: string }
```

---

## 6. Applications

**Status**: Not implemented yet. Planned for `apps/server/src/routers/application.ts`.

### Planned Endpoints

```typescript
// applications.apply
// Submit a job application
// Procedure: candidateProcedure.mutation()
{
  jobId: string;
  coverLetter?: string;       // max 2000
  resumeUrl?: string;
  answers?: Record<string, string>;
}

// applications.list
// List the authenticated candidate's applications
// Procedure: candidateProcedure.query()
{
  status?: ApplicationStatus;
  page?: number;
  pageSize?: number;
}

// applications.getById
// Procedure: candidateProcedure.query()
{ id: string }

// applications.withdraw
// Withdraw an application (only if PENDING or VIEWED)
// Procedure: candidateProcedure.mutation()
{ id: string }

// applications.listForEmployer
// List applications received for the employer's jobs
// Procedure: employerProcedure.query()
{
  jobId?: string;
  status?: ApplicationStatus;
  page?: number;
  pageSize?: number;
}

// applications.updateStatus
// Change application status (employer only)
// Procedure: employerProcedure.mutation()
{
  id: string;
  status: ApplicationStatus;
}

// applications.addNote
// Add private notes to an application
// Procedure: employerProcedure.mutation()
{
  applicationId: string;
  note: string;
}

// applications.bulkUpdateStatus
// Bulk update application statuses
// Procedure: employerProcedure.mutation()
{
  ids: string[];
  status: ApplicationStatus;
}

// applications.exportCsv
// Export applications as CSV
// Procedure: employerProcedure.mutation()
{ jobId?: string }  // Returns download URL
```

### Application Statuses

```typescript
type ApplicationStatus =
  | "PENDING"
  | "VIEWED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "OFFERED"
  | "REJECTED"
  | "WITHDRAWN";
```

---

## 7. Saved Jobs

**Status**: Not implemented yet. Planned for `apps/server/src/routers/savedJob.ts`.

### Planned Endpoints

```typescript
// savedJobs.toggle
// Save or unsave a job
// Procedure: candidateProcedure.mutation()
{ jobId: string }

// savedJobs.list
// List the authenticated candidate's saved jobs
// Procedure: candidateProcedure.query()
{ page?: number; pageSize?: number }

// savedJobs.isSaved
// Check if a job is saved
// Procedure: candidateProcedure.query()
{ jobId: string }
```

---

## 8. Conversations

**Status**: Not implemented yet. Planned for `apps/server/src/routers/conversation.ts`.

### Planned Endpoints

```typescript
// conversations.list
// List all conversations for the authenticated user
// Procedure: protectedProcedure.query()
{
  page?: number;
  pageSize?: number;
}

// conversations.getById
// Get conversation details with participants
// Procedure: protectedProcedure.query()
{ id: string }

// conversations.markAsRead
// Mark all messages in a conversation as read
// Procedure: protectedProcedure.mutation()
{ id: string }

// conversations.create
// Start a new conversation
// Procedure: protectedProcedure.mutation()
{
  recipientId: string;
  jobId?: string;
  initialMessage?: string;
}
```

---

## 9. Messages

**Status**: Not implemented yet. Planned for `apps/server/src/routers/message.ts`.

### Planned Endpoints

```typescript
// messages.send
// Send a message in a conversation
// Procedure: protectedProcedure.mutation()
{
  conversationId: string;
  content: string;  // 1-2000 chars
}

// messages.list
// List messages in a conversation with pagination
// Procedure: protectedProcedure.query()
{
  conversationId: string;
  cursor?: string;    // Message ID for cursor pagination
  limit?: number;    // Default: 50, max: 100
}

// messages.markAsRead
// Mark a specific message as read
// Procedure: protectedProcedure.mutation()
{ id: string }
```

### Realtime

Messages are delivered via **Server-Sent Events (SSE)** at:

```
GET /api/sse/messages
```

Clients subscribe to receive new messages in real-time.

---

## 10. Notifications

**Status**: Not implemented yet. Planned for `apps/server/src/routers/notification.ts`.

### Notification Types

```typescript
type NotificationType =
  | "APPLICATION_RECEIVED"  // Employer receives new application
  | "APPLICATION_STATUS"    // Candidate's application status changed
  | "MESSAGE"              // New message received
  | "JOB_ALERT"            // New job matching candidate's skills
  | "JOB_APPROVED"         // Employer's job approved by admin
  | "JOB_REJECTED"         // Employer's job rejected by admin
  | "SYSTEM";              // System announcements
```

### Planned Endpoints

```typescript
// notifications.list
// List notifications for the authenticated user
// Procedure: protectedProcedure.query()
{
  unreadOnly?: boolean;
  cursor?: string;
  limit?: number;  // Default: 20, max: 50
}

// notifications.markAsRead
// Mark a notification as read
// Procedure: protectedProcedure.mutation()
{ id: string }

// notifications.markAllAsRead
// Mark all notifications as read
// Procedure: protectedProcedure.mutation()
{}

// notifications.delete
// Delete a notification
// Procedure: protectedProcedure.mutation()
{ id: string }

// notifications.getUnreadCount
// Get count of unread notifications
// Procedure: protectedProcedure.query()
{}

// notifications.getPreferences
// Get notification preferences
// Procedure: protectedProcedure.query()
{}

// notifications.updatePreferences
// Update notification preferences
// Procedure: protectedProcedure.mutation()
{
  email?: {
    applications?: boolean;
    messages?: boolean;
    jobAlerts?: boolean;
    marketing?: boolean;
  };
  push?: {
    enabled?: boolean;
    applications?: boolean;
    messages?: boolean;
  };
  inApp?: {
    enabled?: boolean;
    sound?: boolean;
  };
}
```

### Realtime

Notifications are delivered via **Server-Sent Events (SSE)** at:

```
GET /api/sse/notifications
```

---

## Data Models

### User

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  emailVerified: boolean;
  role: "CANDIDATE" | "EMPLOYER" | "ADMIN";
  createdAt: Date;
  updatedAt: Date;
}
```

### Profile

```typescript
interface Profile {
  id: string;
  userId: string;
  headline?: string;
  summary?: string;
  skills: string[];
  experience?: Experience[];  // JSON
  education?: Education[];    // JSON
  resumeUrl?: string;
  portfolioUrl?: string;
  location?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Organization

```typescript
interface Organization {
  id: string;
  userId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  companySize?: "STARTUP" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";
  foundedYear?: number;
  location?: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Job

```typescript
interface Job {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  requirements?: string;
  benefits?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: "HOURLY" | "MONTHLY" | "YEARLY";
  salaryNegotiable: boolean;
  location: string;
  workType: "REMOTE" | "HYBRID" | "ONSITE";
  jobType: "FULLTIME" | "PARTIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
  experienceLevel: "ENTRY" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "EXECUTIVE";
  status: "DRAFT" | "PENDING_APPROVAL" | "OPEN" | "CLOSED" | "ARCHIVED";
  publishedAt?: Date;
  expiresAt?: Date;
  views: number;
  applicationsCount: number;
  skills: string[];  // via JobSkill table
  createdAt: Date;
  updatedAt: Date;
}
```

### Application

```typescript
interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  coverLetter?: string;
  resumeUrl?: string;
  answers?: Record<string, string>;  // JSON
  notes?: string;  // Employer notes
  appliedAt: Date;
  updatedAt: Date;
}
```

### Conversation

```typescript
interface Conversation {
  id: string;
  jobId?: string;
  employerId: string;
  candidateId: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Message

```typescript
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}
```

### Notification

```typescript
interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;  // JSON
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}
```

---

## Enums Reference

```typescript
// UserRole
type UserRole = "CANDIDATE" | "EMPLOYER" | "ADMIN";

// CompanySize
type CompanySize = "STARTUP" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";

// SalaryType
type SalaryType = "HOURLY" | "MONTHLY" | "YEARLY";

// WorkType
type WorkType = "REMOTE" | "HYBRID" | "ONSITE";

// JobType
type JobType = "FULLTIME" | "PARTIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";

// ExperienceLevel
type ExperienceLevel = "ENTRY" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "EXECUTIVE";

// JobStatus
type JobStatus = "DRAFT" | "PENDING_APPROVAL" | "OPEN" | "CLOSED" | "ARCHIVED";

// ApplicationStatus
type ApplicationStatus =
  | "PENDING"
  | "VIEWED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "OFFERED"
  | "REJECTED"
  | "WITHDRAWN";

// NotificationType
type NotificationType =
  | "APPLICATION_RECEIVED"
  | "APPLICATION_STATUS"
  | "MESSAGE"
  | "JOB_ALERT"
  | "JOB_APPROVED"
  | "JOB_REJECTED"
  | "SYSTEM";
```

---

## HTTP Status Codes

tRPC errors map to standard HTTP codes:

| tRPC Code | HTTP Status |
|-----------|-------------|
| `BAD_REQUEST` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `INTERNAL_SERVER_ERROR` | 500 |
| `BAD_GATEWAY` | 502 |
| `SERVER_ERROR` | 500 |
| `TIMEOUT` | 408 |

---

## Rate Limiting

Not currently configured. Planned for production deployment.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-19 | Initial specification. Implemented: health, user, profile, organization routers. |
