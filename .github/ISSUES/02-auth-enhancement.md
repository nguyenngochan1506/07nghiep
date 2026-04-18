# Issue #2: Authentication Enhancement

## Metadata
- **Issue Number:** #2
- **Labels:** `shared/auth`, `priority/high`, `size/m`
- **Assignee:** Dev 1 (Database & Auth Lead)
- **Milestone:** M1 - Foundation
- **Epic:** Foundation
- **Estimate:** 8-10h

## Problem Statement

We need to enhance the Better Auth configuration to support role-based access control, email verification, password reset, and organization management for three user types: Candidate, Employer, and Admin. The `User` model with Better Auth tables already exists in `packages/db/prisma/schema/auth.prisma`, but the auth configuration, email flows, and role-based tRPC procedures are not yet implemented.

## Requirements

### 1. Role-Based Access Control

The `UserRole` enum (`CANDIDATE`, `EMPLOYER`, `ADMIN`) already exists in `packages/db/prisma/schema/schema.prisma` and is used by the `User` model. The task is to wire up role checking in tRPC procedures.

### 2. Organization Plugin Setup

Configure Better Auth organization plugin for employers:

```typescript
import { organization } from "better-auth/plugins/organization"

const auth = betterAuth({
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      defaultRole: "member",
      roles: ["owner", "admin", "member"],
    })
  ]
})
```

Requires adding Better Auth internal tables: `organization`, `member`, `invitation`, `team`, `team_member` to `auth.prisma`.

### 3. Email Verification

Setup email verification flow:
- Verification email on signup via `emailVerification.sendVerificationEmail`
- Resend verification option
- `emailVerified` field already exists on `User` model (defaults to `false`)

### 4. Password Reset

Setup password reset flow:
- Forgot password endpoint via `emailAndPassword.sendResetPassword`
- Reset email with token
- Password reset form

### 5. Protected Procedure Enhancement

Create role-based middleware:

```typescript
// packages/api/src/index.ts
export const candidateProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'CANDIDATE') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Candidate access required'
    });
  }
  return next({ ctx });
});

export const employerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'EMPLOYER') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Employer access required'
    });
  }
  return next({ ctx });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required'
    });
  }
  return next({ ctx });
});
```

### 6. Session Management

Configure session handling:
- Session duration: 7 days (default)
- Refresh token rotation
- Multiple sessions support
- Cookie `sameSite` configuration for dev (localhost) vs production

## Tasks Checklist

```markdown
- [ ] Task 1: Schema & Database Foundation
  - [ ] 1.1. Add Better Auth organization plugin tables to auth.prisma (organization, member, invitation, team, team_member)
  - [ ] 1.2. Update env schema: add EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM, optional GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  - [ ] 1.3. Run `npx @better-auth/cli migrate` to generate auth tables
  - [ ] 1.4. Write unit tests for Zod env schema validation
- [ ] Task 2: Better Auth Configuration
  - [ ] 2.1. Configure emailVerification.sendVerificationEmail with email utility
  - [ ] 2.2. Configure emailAndPassword.sendResetPassword with email utility
  - [ ] 2.3. Configure session options: 7-day expiry, refresh token rotation
  - [ ] 2.4. Add organization() plugin for employers
  - [ ] 2.5. Add Google OAuth provider (if env vars present)
  - [ ] 2.6. Export typed session/user types from auth package
  - [ ] 2.7. Write unit tests for email utility
- [ ] Task 3: Role-Based tRPC Procedures
  - [ ] 3.1. Create candidateProcedure, employerProcedure, adminProcedure middleware chains
  - [ ] 3.2. Create role-check utility functions
  - [ ] 3.3. Export all procedures from packages/api/src/index.ts
  - [ ] 3.4. Write unit tests for role middleware
```

## Files to Modify

### Task 1: Schema & Database Foundation
- `packages/db/prisma/schema/auth.prisma`
- `packages/env/src/server.ts`

### Task 2: Better Auth Configuration
- `packages/auth/src/index.ts`
- New: `packages/auth/src/email.ts` (email sending utility)
- New: `packages/auth/src/types.ts` (re-export Better Auth session types with role)

### Task 3: Role-Based tRPC Procedures
- `packages/api/src/index.ts`
- New: `packages/api/src/procedures/role.ts` (role middleware helpers)
- New: `packages/api/src/procedures/candidate.ts`
- New: `packages/api/src/procedures/employer.ts`
- New: `packages/api/src/procedures/admin.ts`

## Dependencies

- **Blocked By:** #1 (Database Schema) - User model and UserRole enum needed

## Technical Notes

### Current Schema State

The `User` model and Better Auth tables (`Session`, `Account`, `Verification`) already exist in `packages/db/prisma/schema/auth.prisma`:

```prisma
model User {
  id            String    @id
  name          String
  email         String
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  role          UserRole  @default(CANDIDATE)
  // ...relations
  @@unique([email])
}

model Session {
  id, expiresAt, token, ipAddress, userAgent, userId
}

model Account {
  id, accountId, providerId, userId, accessToken, refreshToken, idToken, ...
}

model Verification {
  id, identifier, value, expiresAt
}
```

### Environment Variables Required

Already defined in `packages/env/src/server.ts`:
- `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `NODE_ENV`

Need to add:
```env
# Email (for verification/reset)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=user@example.com
EMAIL_PASSWORD=password
EMAIL_FROM=noreply@07nghiep.com

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Better Auth Client Usage

```typescript
// Sign up with role
await signUp.email({
  email: "user@example.com",
  password: "password",
  name: "John Doe",
  metadata: {
    role: "CANDIDATE" // or "EMPLOYER"
  }
});

// Role check
const { data: { user } } = useSession();
if (user.role === 'CANDIDATE') {
  // Show candidate UI
}
```

### Cookie Configuration Note

Cookie `sameSite: "none"` requires HTTPS in production. Adjust for dev (localhost) vs production environments.

## Success Criteria

1. Users can sign up with role selection
2. Email verification works
3. Password reset works
4. Role-specific procedures enforce access
5. Sessions properly managed (7-day expiry)
6. All tests passing (`pnpm check-types` + `pnpm build` + `pnpm test`)

## Related Issues

- #1 (Database Schema) - prerequisite
- #3 (API Foundation) - will use these procedures
