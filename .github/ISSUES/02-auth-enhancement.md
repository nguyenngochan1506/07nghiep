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

## Tasks

- [ ] Add role field to User model in schema
- [ ] Setup organization plugin
- [ ] Configure email verification
- [ ] Configure password reset
- [ ] Create role-specific procedures
- [ ] Add role check middleware
- [ ] Update session handling
- [ ] Write tests for auth flows

## Files to Modify

- `packages/auth/src/index.ts`
- `packages/db/prisma/schema/schema.prisma`
- `packages/api/src/index.ts`

## Dependencies

Blocked by: #1 (Database Schema)

## Estimate

8-10h

## Related Issues

- #1 (Database Schema) - prerequisite
- #3 (API Foundation) - will use these procedures