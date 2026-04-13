# Issue #13: Notification System

## Metadata
- **Issue Number:** #13
- **Labels:** `shared/api`, `app/candidate`, `app/employer`, `app/admin`, `type/feature`, `priority/medium`, `size/l`
- **Assignee:** Dev 4 (Admin & Infrastructure Lead)
- **Milestone:** M5 - Polish
- **Epic:** Infrastructure
- **Estimate:** 12-14h

## Problem Statement

Implement an in-app notification system with real-time updates, email notifications, and user preferences for notifications.

## Requirements

### 1. Notification Types

| Type | Trigger | Recipient |
|------|---------|-----------|
| `APPLICATION_RECEIVED` | Candidate applies | Employer |
| `APPLICATION_STATUS` | Status changes | Candidate |
| `MESSAGE` | New message | Recipient |
| `JOB_ALERT` | New job matching skills | Candidate |
| `JOB_APPROVED` | Job approved by admin | Employer |
| `JOB_REJECTED` | Job rejected by admin | Employer |
| `SYSTEM` | System announcements | All users |

### 2. Notification API

```typescript
// notifications router
notifications.list: protectedProcedure
  .input(z.object({
    unreadOnly: z.boolean().optional(),
    cursor: z.string().optional(),
    limit: z.number().min(1).max(50).default(20)
  }))
  .query(...)

notifications.markAsRead: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(...)

notifications.markAllAsRead: protectedProcedure.mutation(...)

notifications.delete: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(...)

notifications.getUnreadCount: protectedProcedure.query(...)

// Preferences
notifications.getPreferences: protectedProcedure.query(...)
notifications.updatePreferences: protectedProcedure
  .input(notificationPreferencesSchema)
  .mutation(...)
```

### 3. Real-time Notifications

- Server-Sent Events (SSE) for instant updates
- Notification bell with unread count
- Toast notifications for important alerts

### 4. Notification Bell Component

```
┌────────────────────────────────────────┐
│ 🔔 (5)                                 │
│                                        │
│ ────────────────────────────────────   │
│ 📩 New application for "React Dev"      │
│    2 minutes ago                       │
│ ────────────────────────────────────   │
│ ✉️ Message from John Doe               │
│    5 minutes ago                       │
│ ────────────────────────────────────   │
│ ⚠️ Your job was approved               │
│    1 hour ago                          │
│ ────────────────────────────────────   │
│ [View All Notifications]               │
└────────────────────────────────────────┘
```

### 5. Email Notifications

Using Resend or SendGrid:

- New application received
- Application status changed
- New message (optional, user preference)
- Job matching alerts (optional)
- Password reset
- Email verification

### 6. Notification Preferences

```typescript
interface NotificationPreferences {
  email: {
    applications: boolean;      // Application updates
    messages: boolean;          // New messages
    jobAlerts: boolean;        // Matching jobs
    marketing: boolean;         // Promotions
  };
  push: {
    enabled: boolean;
    applications: boolean;
    messages: boolean;
  };
  inApp: {
    enabled: boolean;
    sound: boolean;
  };
}
```

## Tasks Checklist

```markdown
- [ ] 1. Create notification model (already in #1)
- [ ] 2. Create notification API
- [ ] 3. Create notification preferences API
- [ ] 4. Implement SSE for real-time
- [ ] 5. Create notification bell component
- [ ] 6. Create notification list page
- [ ] 7. Add notification triggers
- [ ] 8. Integrate email service
- [ ] 9. Create email templates
- [ ] 10. Create preferences page
- [ ] 11. Add sound notification (optional)
- [ ] 12. Add notification grouping
```

## Files to Create/Modify

### Backend
```
packages/api/src/
├── routers/
│   └── notification.ts
├── services/
│   └── notification.service.ts  # Trigger notifications
apps/server/src/
├── services/
│   └── email.service.ts
├── email-templates/
│   ├── application-received.tsx
│   ├── application-status.tsx
│   └── password-reset.tsx
```

### Frontend (All Apps)
```
apps/{admin,candidate,employer}/src/
├── components/
│   ├── notification/
│   │   ├── notification-bell.tsx
│   │   ├── notification-list.tsx
│   │   ├── notification-item.tsx
│   │   └── notification-preferences.tsx
├── hooks/
│   └── use-notifications.ts
├── routes/
│   └── notifications.tsx  # Notification list page
```

## Trigger Integration

### In Application Router
```typescript
// When application is created
await notificationService.create({
  userId: job.employerId,
  type: 'APPLICATION_RECEIVED',
  title: 'New Application',
  body: `${candidate.name} applied to ${job.title}`,
  data: { applicationId, jobId }
});

// When status changes
await notificationService.create({
  userId: application.candidateId,
  type: 'APPLICATION_STATUS',
  title: 'Application Update',
  body: `Your application status changed to ${newStatus}`,
  data: { applicationId, status: newStatus }
});
```

### In Message Router
```typescript
// When message is sent
await notificationService.create({
  userId: recipientId,
  type: 'MESSAGE',
  title: 'New Message',
  body: `${sender.name}: ${message.content.substring(0, 50)}...`,
  data: { conversationId, messageId }
});
```

## Email Templates

### Application Received (for Employer)
```
Subject: New Application for {{jobTitle}}

Hi {{employerName}},

{{candidateName}} has applied to your job posting "{{jobTitle}}".

View their profile: {{profileLink}}
View application: {{applicationLink}}

Best regards,
07nghiep Team
```

## Dependencies

- **Blocked By:** 
  - #1 (Database Schema) - notification model
  - Email service configuration

## Success Criteria

1. Notifications created on triggers
2. Real-time updates via SSE
3. Notification bell shows unread count
4. Can mark as read
5. Can delete notifications
6. Email notifications sent
7. User preferences respected
8. Notifications persist across sessions

## Related Issues

- #6 (Application Flow) - triggers notifications
- #8 (Application Management) - triggers notifications
- #9 (Messaging) - triggers notifications
