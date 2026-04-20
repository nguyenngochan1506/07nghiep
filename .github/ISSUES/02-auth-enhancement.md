# Issue #2: Authentication Enhancement - RBAC & Email Verification

## Metadata
- **Issue Number:** #2
- **Labels:** `shared/auth`, `priority/high`, `size/l`
- **Assignee:** Dev 1 (Database & Auth Lead)
- **Milestone:** M1 - Foundation
- **Epic:** Foundation
- **Estimate:** 8-10h

## Problem Statement

We need to enhance the Better Auth configuration to support role-based access control, email verification, and proper session management for our three user types: Candidate, Employer, and Admin.

## Requirements

### 1. Role-Based Access Control

Add role management with CANDIDATE, EMPLOYER, ADMIN roles.

### 2. Organization Plugin Setup

Configure Better Auth organization plugin for employers.

### 3. Email Verification

Setup email verification flow:
- Verification email on signup
- Resend verification option
- Verified status tracking

### 4. Password Reset

Setup password reset flow:
- Forgot password endpoint
- Reset email with token
- Password reset form

### 5. Protected Procedure Enhancement

Create role-based middleware:
- `candidateProcedure` - only CANDIDATE role
- `employerProcedure` - only EMPLOYER role
- `adminProcedure` - only ADMIN role

### 6. Session Management

Configure session handling with 7-day expiration.

## Tasks Checklist

```markdown
- [x] 1. Add role field to User model in schema
- [x] 2. Setup organization plugin
- [x] 3. Configure email verification (using emailOTP plugin)
- [x] 4. Configure password reset (using emailOTP plugin)
- [x] 5. Create role-specific procedures (candidateProcedure, employerProcedure, adminProcedure)
- [x] 6. Add role check middleware
- [x] 7. Update session handling (7-day expiry)
- [ ] 8. Write tests for auth flows (skipped per user request)
```

## Files to Modify

- `packages/auth/src/index.ts`
- `packages/db/prisma/schema/schema.prisma`
- `packages/api/src/index.ts`

## Dependencies

- **Blocked By:** #1 (Database Schema)

## Success Criteria

1. Role-based procedures correctly enforce access control
2. Email verification flow works end-to-end
3. Password reset flow works end-to-end
4. Sessions expire after 7 days of inactivity
5. All procedures properly typed with role context

## Related Issues

- #1 (Database Schema) - prerequisite
- #3 (API Foundation) - will use these procedures
- #4 (Job Search) - will use role-based access
- #6 (Application Flow) - will use role-based access
