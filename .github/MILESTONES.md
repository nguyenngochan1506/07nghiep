# Milestones - 07nghiep Job Board

## Overview

This document defines the milestones for the 07nghiep Job Board project. Each milestone represents a significant phase of development with a target completion date.

---

## M1: Foundation

**Target Date:** Week 1-2  
**Issues:** #1, #2, #3  
**Status:** Not Started

### Description

Establish the foundation for the entire application:
- Database schema with all core models
- Enhanced authentication with role-based access
- Basic API endpoints for users, profiles, and organizations

### Deliverables

- [ ] Complete database schema (Issue #1)
- [ ] Enhanced authentication system (Issue #2)
- [ ] API foundation with CRUD operations (Issue #3)

### Success Criteria

1. All database models created and tested
2. Users can sign up with role selection
3. Role-based access control working
4. Basic API endpoints functional

### Dependencies

- None (this is the starting point)

---

## M2: Candidate MVP

**Target Date:** Week 2-3  
**Issues:** #4, #5, #6  
**Status:** Not Started

### Description

Complete the candidate-facing features:
- Job search and filtering
- Profile and CV management
- Job application flow

### Deliverables

- [ ] Job listing with search and filters (Issue #4)
- [ ] Candidate profile and CV upload (Issue #5)
- [ ] Job application submission and tracking (Issue #6)

### Success Criteria

1. Candidates can search and view jobs
2. Candidates can create and edit profiles
3. Candidates can apply to jobs
4. Candidates can track application status

### Dependencies

- M1 (Foundation) - requires API foundation

---

## M3: Employer MVP

**Target Date:** Week 3-4  
**Issues:** #7, #8, #9  
**Status:** Not Started

### Description

Complete the employer-facing features:
- Job posting management
- Application management
- Messaging system

### Deliverables

- [ ] Job posting form and dashboard (Issue #7)
- [ ] Application review and management (Issue #8)
- [ ] Real-time messaging (Issue #9)

### Success Criteria

1. Employers can create and manage job postings
2. Employers can view and manage applications
3. Employers and candidates can message each other

### Dependencies

- M1 (Foundation) - requires API foundation
- M2 (Candidate MVP) - receives applications

---

## M4: Admin MVP

**Target Date:** Week 4-5  
**Issues:** #10, #11, #12  
**Status:** Not Started

### Description

Complete the admin dashboard:
- Overview and statistics
- User management
- Content moderation

### Deliverables

- [ ] Admin dashboard with key metrics (Issue #10)
- [ ] User management system (Issue #11)
- [ ] Job and content moderation tools (Issue #12)

### Success Criteria

1. Admin can view platform statistics
2. Admin can manage users
3. Admin can moderate content

### Dependencies

- M1 (Foundation) - requires API foundation
- M2 (Candidate MVP) - has users
- M3 (Employer MVP) - has job posts

---

## M5: Polish

**Target Date:** Week 5-6  
**Issues:** #13, #14  
**Status:** Not Started

### Description

Polish and enhance the platform:
- Notification system
- Analytics dashboards

### Deliverables

- [ ] In-app and email notifications (Issue #13)
- [ ] Analytics dashboards (Issue #14)

### Success Criteria

1. Users receive notifications for important events
2. Admin has analytics dashboard
3. Employers have job performance analytics

### Dependencies

- M2 (Candidate MVP) - has applications
- M3 (Employer MVP) - has job postings
- M4 (Admin MVP) - admin dashboard ready

---

## M6: Launch Prep (Future)

**Target Date:** Week 6-7  
**Issues:** TBD  
**Status:** Not Planned

### Description

Prepare for production launch:
- Performance optimization
- Security audit
- Documentation
- Deployment automation

### Deliverables

- [ ] Performance optimizations
- [ ] Security review
- [ ] User documentation
- [ ] Deployment scripts

---

## Milestone Timeline

```
Week 1-2     Week 2-3     Week 3-4     Week 4-5     Week 5-6
    │            │            │            │            │
    ▼            ▼            ▼            ▼            ▼
┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
│   M1   │──▶│   M2   │──▶│   M3   │──▶│   M4   │──▶│   M5   │
│  Found │   │Candidat│   │Employe │   │  Admin │   │Polish │
│  ation │   │   e    │   │   r    │   │        │   │       │
└────────┘   └────────┘   └────────┘   └────────┘   └────────┘
```

---

## GitHub Milestone Setup

To create these milestones on GitHub, run:

```bash
# M1 - Foundation
gh issue milestone create "M1 - Foundation" \
  --description "Database schema, Auth, API foundation" \
  --due-date $(date -d "+14 days" +%Y-%m-%d)

# M2 - Candidate MVP
gh issue milestone create "M2 - Candidate MVP" \
  --description "Job search, Profile, Applications" \
  --due-date $(date -d "+21 days" +%Y-%m-%d)

# M3 - Employer MVP
gh issue milestone create "M3 - Employer MVP" \
  --description "Job posting, Application management, Messaging" \
  --due-date $(date -d "+28 days" +%Y-%m-%d)

# M4 - Admin MVP
gh issue milestone create "M4 - Admin MVP" \
  --description "Dashboard, User management, Moderation" \
  --due-date $(date -d "+35 days" +%Y-%m-%d)

# M5 - Polish
gh issue milestone create "M5 - Polish" \
  --description "Notifications, Analytics" \
  --due-date $(date -d "+42 days" +%Y-%m-%d)
```

Then add issues to milestones:

```bash
# M1 - Foundation
gh issue edit 1 --add-milestone "M1 - Foundation"
gh issue edit 2 --add-milestone "M1 - Foundation"
gh issue edit 3 --add-milestone "M1 - Foundation"

# M2 - Candidate MVP
gh issue edit 4 --add-milestone "M2 - Candidate MVP"
gh issue edit 5 --add-milestone "M2 - Candidate MVP"
gh issue edit 6 --add-milestone "M2 - Candidate MVP"

# M3 - Employer MVP
gh issue edit 7 --add-milestone "M3 - Employer MVP"
gh issue edit 8 --add-milestone "M3 - Employer MVP"
gh issue edit 9 --add-milestone "M3 - Employer MVP"

# M4 - Admin MVP
gh issue edit 10 --add-milestone "M4 - Admin MVP"
gh issue edit 11 --add-milestone "M4 - Admin MVP"
gh issue edit 12 --add-milestone "M4 - Admin MVP"

# M5 - Polish
gh issue edit 13 --add-milestone "M5 - Polish"
gh issue edit 14 --add-milestone "M5 - Polish"
```

---

## Velocity Tracking

| Milestone | Planned | Actual | Notes |
|-----------|---------|--------|-------|
| M1 | 2 weeks | - | Foundation work |
| M2 | 1 week | - | Dependent on M1 |
| M3 | 1 week | - | Dependent on M1 |
| M4 | 1 week | - | Dependent on M1-M3 |
| M5 | 1 week | - | Polish phase |

---

## Release Strategy

### Phase 1: Internal Testing (After M5)
- Deploy to staging environment
- Team testing and bug fixes

### Phase 2: Beta Launch
- Open registration for select users
- Gather feedback

### Phase 3: Production Launch
- Deploy to production
- Monitor metrics

---

## Last Updated

2026-04-13
