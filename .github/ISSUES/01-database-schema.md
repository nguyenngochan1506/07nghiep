# Issue #1: Database Schema - Core Models

## Metadata
- **Issue Number:** #1
- **Labels:** `shared/db`, `priority/high`, `size/l`
- **Assignee:** Dev 1 (Database & Auth Lead)
- **Milestone:** M1 - Foundation
- **Epic:** None (foundation task)
- **Estimate:** 16-20h

## Problem Statement

The current Prisma schema is empty. We need to define the core data models for the entire job board system, including users, profiles, organizations, jobs, applications, notifications, and messages.

## Requirements

### Data Models Required

1. **User** (extends Better Auth)
   - Already managed by Better Auth
   - Add role enum: `CANDIDATE`, `EMPLOYER`, `ADMIN`

2. **Profile** (candidate profile/CV)
   - `id`, `userId` (relation)
   - `headline` (string, optional)
   - `summary` (text, optional)
   - `skills` (String[], optional)
   - `experience` (Json, optional) - array of experience objects
   - `education` (Json, optional) - array of education objects
   - `resumeUrl` (string, optional)
   - `portfolioUrl` (string, optional)
   - `location` (string, optional)
   - `phone` (string, optional)
   - `avatarUrl` (string, optional)
   - `createdAt`, `updatedAt`

3. **Organization** (employer company profile)
   - `id`, `userId` (relation)
   - `name` (string, required)
   - `description` (text, optional)
   - `logoUrl` (string, optional)
   - `website` (string, optional)
   - `industry` (string, optional)
   - `companySize` (enum: `STARTUP`, `SMALL`, `MEDIUM`, `LARGE`, `ENTERPRISE`)
   - `foundedYear` (int, optional)
   - `location` (string, optional)
   - `verified` (boolean, default: false)
   - `createdAt`, `updatedAt`

4. **Job** (job posting)
   - `id`
   - `organizationId` (relation)
   - `title` (string, required)
   - `description` (text, required)
   - `requirements` (text, optional)
   - `benefits` (text, optional)
   - `salaryMin` (decimal, optional)
   - `salaryMax` (decimal, optional)
   - `salaryType` (enum: `HOURLY`, `MONTHLY`, `YEARLY`)
   - `salaryNegotiable` (boolean, default: false)
   - `location` (string, required)
   - `workType` (enum: `REMOTE`, `HYBRID`, `ONSITE`)
   - `jobType` (enum: `FULLTIME`, `PARTIME`, `CONTRACT`, `INTERNSHIP`, `FREELANCE`)
   - `experienceLevel` (enum: `ENTRY`, `JUNIOR`, `MIDDLE`, `SENIOR`, `LEAD`, `EXECUTIVE`)
   - `status` (enum: `DRAFT`, `PENDING_APPROVAL`, `OPEN`, `CLOSED`, `ARCHIVED`)
   - `publishedAt` (datetime, optional)
   - `expiresAt` (datetime, optional)
   - `views` (int, default: 0)
   - `applicationsCount` (int, default: 0)
   - `createdAt`, `updatedAt`

5. **Application** (job application)
   - `id`
   - `jobId` (relation)
   - `candidateId` (relation to User)
   - `status` (enum: `PENDING`, `VIEWED`, `SHORTLISTED`, `INTERVIEW`, `OFFERED`, `REJECTED`, `WITHDRAWN`)
   - `coverLetter` (text, optional)
   - `resumeUrl` (string, optional)
   - `answers` (Json, optional) - answers to job questions
   - `appliedAt` (datetime)
   - `updatedAt`
   - `notes` (text, optional) - employer notes

6. **SavedJob** (saved/favorited jobs)
   - `id`
   - `userId` (relation)
   - `jobId` (relation)
   - `savedAt` (datetime)
   - Unique constraint on (userId, jobId)

7. **Notification**
   - `id`
   - `userId` (relation)
   - `type` (enum: `APPLICATION_RECEIVED`, `APPLICATION_STATUS`, `MESSAGE`, `JOB_ALERT`, `SYSTEM`)
   - `title` (string)
   - `body` (text)
   - `data` (Json, optional) - additional data
   - `read` (boolean, default: false)
   - `readAt` (datetime, optional)
   - `createdAt`

8. **Conversation**
   - `id`
   - `jobId` (relation, optional)
   - `employerId` (relation to User)
   - `candidateId` (relation to User)
   - `lastMessageAt` (datetime)
   - `createdAt`, `updatedAt`
   - Unique constraint on (employerId, candidateId, jobId)

9. **Message**
   - `id`
   - `conversationId` (relation)
   - `senderId` (relation to User)
   - `content` (text)
   - `read` (boolean, default: false)
   - `readAt` (datetime, optional)
   - `createdAt`

10. **JobSkill** (job required skills - many-to-many)
    - `id`
    - `jobId` (relation)
    - `skill` (string)
    - Unique constraint on (jobId, skill)

## Tasks Checklist

```markdown
- [x] 1. Design and create User model extension with role enum
- [x] 2. Create Profile model with all fields
- [x] 3. Create Organization model with all fields
- [x] 4. Create Job model with all fields and enums
- [x] 5. Create Application model with all fields
- [x] 6. Create SavedJob model
- [x] 7. Create Notification model
- [x] 8. Create Conversation model
- [x] 9. Create Message model
- [x] 10. Create JobSkill model (tags)
- [x] 11. Add proper indexes for performance
- [x] 12. Add relations and constraints
- [ ] 13. Write seed data for testing (deferred)
- [ ] 14. Document schema changes (deferred)
```

## Files to Modify

- `packages/db/prisma/schema/schema.prisma`

## Dependencies

- None (this is a foundation task)

## Blocked By

- None

## Technical Notes

### Experience JSON Structure
```json
[
  {
    "title": "Software Engineer",
    "company": "Tech Corp",
    "location": "Ho Chi Minh City",
    "startDate": "2020-01",
    "endDate": "2023-06",
    "current": false,
    "description": "..."
  }
]
```

### Education JSON Structure
```json
[
  {
    "degree": "Bachelor of Computer Science",
    "school": "University of Technology",
    "location": "Ho Chi Minh City",
    "startYear": 2016,
    "endYear": 2020,
    "gpa": 3.5
  }
]
```

### Suggested Indexes

```prisma
// Job indexes
@@index([status, publishedAt])
@@index([organizationId, status])
@@index([workType, jobType])
@@index([location])

// Application indexes
@@index([jobId, status])
@@index([candidateId, status])
@@index([appliedAt])

// Notification indexes
@@index([userId, read, createdAt])

// Message indexes
@@index([conversationId, createdAt])
```

## Success Criteria

1. All models created with proper types and constraints
2. Relations properly defined
3. Indexes added for common queries
4. Schema validated with `pnpm db:validate`
5. Migration file generated successfully

## Related Issues

- #2 (Authentication Enhancement) - depends on User model
- #3 (API Foundation) - depends on all models
