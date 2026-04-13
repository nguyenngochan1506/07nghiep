# Issue #9: Messaging System

## Metadata
- **Issue Number:** #9
- **Labels:** `app/employer`, `app/candidate`, `type/feature`, `priority/medium`, `size/l`
- **Assignee:** Dev 3 (Employer BE + API), Dev 2 (Candidate UI)
- **Milestone:** M3 - Employer MVP
- **Epic:** Messaging
- **Estimate:** 14-16h

## Problem Statement

Enable real-time messaging between employers and candidates. Candidates can ask questions about jobs, and employers can communicate with potential hires throughout the hiring process.

## Requirements

### 1. Conversation Management

**Features:**
- Start conversation from job posting
- Start conversation from application
- Conversation list with unread indicators
- Mark as read/unread

### 2. Message API

```typescript
// conversations router
conversations.list: protectedProcedure.query(...)
conversations.getById: protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(...)
conversations.markAsRead: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(...)

// messages router
messages.send: protectedProcedure
  .input(z.object({ 
    conversationId: z.string(),
    content: z.string().min(1).max(2000)
  }))
  .mutation(...)
messages.list: protectedProcedure
  .input(z.object({ 
    conversationId: z.string(),
    cursor: z.string().optional(),
    limit: z.number().min(1).max(50).default(50)
  }))
  .query(...)
```

### 3. Real-time Updates

- Server-Sent Events (SSE) for real-time message delivery
- Fallback to polling if SSE not supported
- Optimistic UI updates

### 4. Messaging UI (Employer)

Route: `/messages`

```
┌────────────────┬────────────────────────────────────┐
│ Conversations  │  John Doe - React Developer        │
│                │                                     │
│ 👤 John D.     │  Sent: Jan 15, 2026 10:30 AM      │
│ [2] Unread    ├────────────────────────────────────│
│                │                                     │
│ 👤 Jane S.     │  Hi, I have a question about...   │
│                │                                     │
│ 👤 Mike T.     │  [Message input area]             │
│                │                                     │
│                │  [Send] [Attach]                    │
└────────────────┴────────────────────────────────────┘
```

**Features:**
- Conversation list sidebar
- Message thread view
- Unread badge
- Typing indicator
- Message timestamps
- Attachment support (optional)

### 5. Messaging UI (Candidate)

Same layout as employer, different styling.

Route: `/messages`

Features:
- View all employer conversations
- Message from job detail
- Message from application detail

### 6. Notifications

- Real-time notification when new message received
- Bell icon badge update
- Sound notification (optional)

## Tasks Checklist

```markdown
- [ ] 1. Create conversation database model
- [ ] 2. Create message database model
- [ ] 3. Create conversation API
- [ ] 4. Create message API
- [ ] 5. Implement SSE for real-time
- [ ] 6. Create employer messaging UI
- [ ] 7. Create candidate messaging UI
- [ ] 8. Add conversation list component
- [ ] 9. Add message thread component
- [ ] 10. Add unread indicators
- [ ] 11. Add typing indicator
- [ ] 12. Add message notifications
- [ ] 13. Add message search (optional)
```

## Files to Create/Modify

### Backend (Dev 3)
```
packages/api/src/
├── routers/
│   ├── conversation.ts
│   └── message.ts
apps/server/src/
├── routes/
│   └── sse.ts  # Server-Sent Events endpoint
```

### Frontend Employer (Dev 3)
```
apps/employer/src/
├── routes/
│   ├── messages.tsx          # Messages layout
│   └── messages.$id.tsx     # Conversation detail
├── components/
│   ├── message/
│   │   ├── conversation-list.tsx
│   │   ├── message-thread.tsx
│   │   ├── message-input.tsx
│   │   ├── message-bubble.tsx
│   │   └── unread-badge.tsx
```

### Frontend Candidate (Dev 2)
```
apps/candidate/src/
├── routes/
│   ├── messages.tsx
│   └── messages.$id.tsx
├── components/
│   └── message/
│       └── (same components, different styles)
```

## Files to Modify

```
apps/employer/src/components/sidebar.tsx  # Add Messages link
apps/candidate/src/components/header.tsx  # Add Messages link
```

## Design Notes

### Message Bubble
```
┌─────────────────────────────────────────┐
│ Message content here                    │
│                                         │
│ 10:30 AM ✓✓                            │
└─────────────────────────────────────────┘
```

### Typing Indicator
```
John is typing...
● ●
```

### Notification Bell
```
🔔 (2)  ← Unread count badge
```

## Real-time Implementation

### SSE Endpoint
```typescript
// apps/server/src/routes/sse.ts
app.get('/sse/messages', async (c) => {
  return sse({
    init: async (send) => {
      // Subscribe to message events
      const unsubscribe = subscribeToMessages(userId, (message) => {
        send({ event: 'message', data: message });
      });
      return () => unsubscribe();
    }
  });
});
```

### Client Subscription
```typescript
// apps/employer/src/hooks/useMessagesSSE.ts
const useMessagesSSE = (conversationId: string) => {
  useEffect(() => {
    const eventSource = new EventSource(`/api/sse/messages?conversation=${conversationId}`);
    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);
      // Add to message list
    };
    return () => eventSource.close();
  }, [conversationId]);
};
```

## Dependencies

- **Blocked By:** 
  - #3 (API Foundation) - basic APIs needed
  - Database models from #1

## Success Criteria

1. Can start conversation from job or application
2. Can send and receive messages in real-time
3. Conversations listed correctly
4. Unread indicators accurate
5. Typing indicator works
6. Messages persist in database
7. Notification on new message
8. Responsive on mobile

## Related Issues

- #6 (Application Flow) - initiate from application
- #13 (Notification System) - integrate notifications
