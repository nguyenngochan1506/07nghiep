# Issue #3: API Foundation - User & Auth

## Metadata
- **Issue Number:** #3
- **Labels:** `shared/api`, `priority/high`, `size/m`
- **Assignee:** Dev 1 (Database & Auth Lead)
- **Milestone:** M1 - Foundation
- **Epic:** Foundation
- **Estimate:** 8-10h

## Problem Statement

Create the foundational API endpoints for user management, profile management, and organization management. These will be the building blocks for all other features.

## Requirements

### 1. User Router

```typescript
// packages/api/src/routers/user.ts
export const userRouter = router({
  // Get current user
  getMe: protectedProcedure.query(async ({ ctx }) => {
    return ctx.session.user;
  }),

  // Update current user
  updateMe: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      image: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update user logic
    }),

  // Get user by ID (public profile)
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Return public user info
    }),
});
```

### 2. Profile Router (Candidates)

```typescript
// packages/api/src/routers/profile.ts
export const profileRouter = router({
  // Get my profile
  getMyProfile: candidateProcedure.query(async ({ ctx }) => {
    return ctx.prisma.profile.findUnique({
      where: { userId: ctx.session.user.id }
    });
  }),

  // Update my profile
  updateMyProfile: candidateProcedure
    .input(profileUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.profile.upsert({
        where: { userId: ctx.session.user.id },
        update: input,
        create: { ...input, userId: ctx.session.user.id }
      });
    }),

  // Get public profile by user ID
  getPublicProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.profile.findUnique({
        where: { userId: input.userId }
      });
    }),

  // Upload resume (returns signed URL)
  getResumeUploadUrl: candidateProcedure
    .input(z.object({ filename: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Generate pre-signed URL for S3/R2
    }),
});
```

### 3. Organization Router (Employers)

```typescript
// packages/api/src/routers/organization.ts
export const organizationRouter = router({
  // Get my organization
  getMyOrganization: employerProcedure.query(async ({ ctx }) => {
    return ctx.prisma.organization.findUnique({
      where: { userId: ctx.session.user.id }
    });
  }),

  // Create organization
  create: employerProcedure
    .input(organizationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.organization.create({
        data: { ...input, userId: ctx.session.user.id }
      });
    }),

  // Update organization
  update: employerProcedure
    .input(organizationUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.organization.update({
        where: { userId: ctx.session.user.id },
        data: input
      });
    }),

  // Get organization by ID (public)
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.organization.findUnique({
        where: { id: input.id }
      });
    }),

  // Get organization's jobs
  getJobs: publicProcedure
    .input(z.object({ 
      organizationId: z.string(),
      status: z.enum(['OPEN', 'CLOSED']).optional()
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.job.findMany({
        where: {
          organizationId: input.organizationId,
          status: input.status || 'OPEN'
        },
        orderBy: { publishedAt: 'desc' }
      });
    }),

  // Request verification
  requestVerification: employerProcedure.mutation(async ({ ctx }) => {
    // Create verification request record
  }),
});
```

### 4. Zod Schemas

Create reusable validation schemas:

```typescript
// packages/api/src/schemas/profile.ts
export const profileUpdateSchema = z.object({
  headline: z.string().max(200).optional(),
  summary: z.string().max(2000).optional(),
  skills: z.array(z.string()).max(50).optional(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    location: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    current: z.boolean(),
    description: z.string().optional(),
  })).optional(),
  education: z.array(z.object({
    degree: z.string(),
    school: z.string(),
    location: z.string().optional(),
    startYear: z.number(),
    endYear: z.number().optional(),
  })).optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  portfolioUrl: z.string().url().optional(),
});

// packages/api/src/schemas/organization.ts
export const organizationCreateSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  companySize: z.enum(['STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']).optional(),
  foundedYear: z.number().min(1800).max(2030).optional(),
  location: z.string().optional(),
});
```

## Tasks Checklist

```markdown
- [ ] 1. Create user router with getMe, updateMe
- [ ] 2. Create profile router with CRUD
- [ ] 3. Create organization router with CRUD
- [ ] 4. Create Zod schemas for validation
- [ ] 5. Add file upload helpers (resume, avatar)
- [ ] 6. Update context to include Prisma
- [ ] 7. Add input validation middleware
- [ ] 8. Create tRPC client utilities
- [ ] 9. Write API documentation
- [ ] 10. Add unit tests
```

## Files to Create/Modify

### New Files
- `packages/api/src/routers/user.ts`
- `packages/api/src/routers/profile.ts`
- `packages/api/src/routers/organization.ts`
- `packages/api/src/schemas/index.ts`
- `packages/api/src/schemas/profile.ts`
- `packages/api/src/schemas/organization.ts`

### Modify Files
- `packages/api/src/routers/index.ts` - merge all routers
- `packages/api/src/context.ts` - add Prisma to context

## Dependencies

- **Blocked By:** 
  - #1 (Database Schema) - need models
  - #2 (Authentication Enhancement) - need procedures

## Success Criteria

1. All CRUD operations work correctly
2. Role-based access enforced
3. Input validation working
4. Proper error handling
5. TypeScript types properly exported
6. tRPC client can access all endpoints

## Related Issues

- #1 (Database Schema) - prerequisite
- #2 (Authentication Enhancement) - prerequisite
- #4 (Job Search) - will use these APIs
- #5 (Profile & CV) - will extend these APIs
