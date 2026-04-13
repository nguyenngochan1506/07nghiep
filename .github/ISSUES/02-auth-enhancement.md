# Issue #2: Authentication Enhancement

## Metadata
- **Issue Number:** #2
- **Labels:** `shared/auth`, `priority/high`, `size/m`
- **Assignee:** Dev 1 (Database & Auth Lead)
- **Milestone:** M1 - Foundation
- **Epic:** Foundation
- **Estimate:** 8-10h

## Problem Statement

We need to enhance the Better Auth configuration to support role-based access control, email verification, and proper session management for our three user types: Candidate, Employer, and Admin.

## Requirements

### 1. Role-Based Access Control

Add role management to Better Auth:

```typescript
// Role enum should be added to User model in Prisma
enum Role {
  CANDIDATE
  EMPLOYER
  ADMIN
}
```

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

## Tasks Checklist

```markdown
- [ ] 1. Add role field to User model in schema
- [ ] 2. Setup organization plugin
- [ ] 3. Configure email verification
- [ ] 4. Configure password reset
- [ ] 5. Create role-specific procedures
- [ ] 6. Add role check middleware
- [ ] 7. Update session handling
- [ ] 8. Add OAuth providers (optional - Google, GitHub)
- [ ] 9. Write tests for auth flows
- [ ] 10. Document auth configuration
```

## Files to Modify

- `packages/auth/src/index.ts`
- `packages/db/prisma/schema/schema.prisma`
- `packages/api/src/index.ts`

## Dependencies

- **Blocked By:** #1 (Database Schema) - need User model

## Technical Notes

### Environment Variables Required

```env
BETTER_AUTH_SECRET=<32+ character secret>
BETTER_AUTH_URL=http://localhost:3000

# Email (for verification/reset)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=user@example.com
EMAIL_PASSWORD=password
EMAIL_FROM=noreply@07nghiep.com

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
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

## Success Criteria

1. Users can sign up with role selection
2. Email verification works
3. Password reset works
4. Role-specific procedures enforce access
5. Sessions properly managed
6. All tests passing

## Related Issues

- #1 (Database Schema) - prerequisite
- #3 (API Foundation) - will use these procedures
