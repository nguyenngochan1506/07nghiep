# Issue #11: User Management

## Metadata
- **Issue Number:** #11
- **Labels:** `app/admin`, `type/feature`, `priority/high`, `size/m`
- **Assignee:** Dev 4 (Admin & Infrastructure Lead)
- **Milestone:** M4 - Admin MVP
- **Epic:** Admin Features
- **Estimate:** 10-12h

## Problem Statement

Admin needs to manage all platform users including viewing user details, suspending/activating accounts, changing roles, and viewing user activity history.

## Requirements

### 1. Users List

Route: `/admin/users`

**Features:**
- Paginated user table
- Filter by role (Candidate, Employer, Admin)
- Filter by status (Active, Suspended)
- Search by name or email
- Sort by date, name
- Bulk actions

**Table Columns:**
| Column | Description |
|--------|-------------|
| Avatar | User avatar |
| Name | Full name |
| Email | Email address |
| Role | CANDIDATE, EMPLOYER, ADMIN |
| Status | Active, Suspended |
| Joined | Registration date |
| Actions | Edit, View, Suspend |

### 2. User Detail

Route: `/admin/users/$userId`

**Sections:**

1. **Profile Overview**
   - Avatar, name, email
   - Role badge
   - Status badge
   - Joined date
   - Last login

2. **Role Management**
   - Change role dropdown
   - Role history

3. **Account Actions**
   - Suspend Account
   - Activate Account
   - Reset Password
   - Delete Account (soft delete)

4. **User Activity**
   - Activity timeline
   - Jobs posted (if employer)
   - Applications submitted (if candidate)
   - Messages sent

5. **Notes**
   - Admin notes about user

### 3. Bulk User Management

- Select multiple users
- Bulk suspend
- Bulk activate
- Bulk export (CSV)

### 4. User Search

- Global search across all users
- Autocomplete suggestions

## Tasks Checklist

```markdown
- [ ] 1. Create users list route
- [ ] 2. Create user table with pagination
- [ ] 3. Create filter components
- [ ] 4. Create user detail page
- [ ] 5. Create role change functionality
- [ ] 6. Create suspend/activate functionality
- [ ] 7. Create user activity timeline
- [ ] 8. Create admin notes feature
- [ ] 9. Implement bulk actions
- [ ] 10. Add user search
- [ ] 11. Add export to CSV
```

## Files to Create

```
apps/admin/src/
├── routes/
│   ├── admin.users.tsx         # Users list
│   └── admin.users.$userId.tsx # User detail
├── components/
│   ├── admin/
│   │   ├── user-table.tsx
│   │   ├── user-filters.tsx
│   │   ├── user-detail.tsx
│   │   ├── role-change-form.tsx
│   │   ├── user-activity.tsx
│   │   ├── user-actions.tsx
│   │   └── bulk-user-actions.tsx
```

## Files to Modify

```
apps/admin/src/components/admin-sidebar.tsx  # Add Users link
```

## API Endpoints Needed

```typescript
// admin.ts router
admin.users.list: adminProcedure
  .input(z.object({
    page: z.number().default(1),
    limit: z.number().default(20),
    role: userRoleSchema.optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
    search: z.string().optional()
  }))
  .query(...)

admin.users.getById: adminProcedure
  .input(z.object({ id: z.string() }))
  .query(...)

admin.users.changeRole: adminProcedure
  .input(z.object({ 
    userId: z.string(), 
    role: userRoleSchema 
  }))
  .mutation(...)

admin.users.suspend: adminProcedure
  .input(z.object({ userId: z.string() }))
  .mutation(...)

admin.users.activate: adminProcedure
  .input(z.object({ userId: z.string() }))
  .mutation(...)

admin.users.delete: adminProcedure
  .input(z.object({ userId: z.string() }))
  .mutation(...)

admin.users.bulkAction: adminProcedure
  .input(z.object({ 
    userIds: z.array(z.string()),
    action: z.enum(['suspend', 'activate'])
  }))
  .mutation(...)

admin.users.export: adminProcedure
  .input(z.object({ 
    role: userRoleSchema.optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED']).optional()
  }))
  .mutation(...)
```

## Design Notes

### User Table Row
```
┌────────────────────────────────────────────────────────────────────┐
│ 👤 John Doe  |  john@example.com  |  Candidate  |  Active  |  Jan │
│               john@example.com                                        
│ [View] [Edit Role] [Suspend]                                        │
└────────────────────────────────────────────────────────────────────┘
```

### Role Badge Colors
| Role | Color |
|------|-------|
| ADMIN | `--destructive` (red) |
| EMPLOYER | `--primary` (blue) |
| CANDIDATE | `--success` (green) |

### Status Badge Colors
| Status | Color |
|--------|-------|
| ACTIVE | `--success` |
| SUSPENDED | `--destructive` |

## Dependencies

- **Blocked By:** 
  - #3 (API Foundation) - basic user APIs

## Success Criteria

1. Can view all users in table
2. Can filter by role and status
3. Can search users
4. Can change user role
5. Can suspend/activate accounts
6. User activity shows relevant history
7. Bulk actions work correctly
8. Export generates valid CSV

## Related Issues

- #10 (Admin Dashboard) - part of admin app
- #2 (Auth Enhancement) - uses role system
