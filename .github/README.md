# GitHub Workflow Setup - Summary

## Quick Start Guide

This document summarizes all GitHub configurations created for the 07nghiep project.

---

## 1. Directory Structure

```
.github/
├── ISSUE_TEMPLATE/
│   ├── feature_request.yml    # Feature request template
│   ├── bug_report.yml         # Bug report template
│   ├── task.yml               # General task template
│   └── config.yml             # Template settings
│
├── workflows/
│   ├── ci.yml                 # CI pipeline (existing)
│   ├── pr-label.yml           # Auto-label PRs
│   └── issue-assign.yml       # Auto-assign issues
│
├── ISSUES/
│   ├── 01-database-schema.md
│   ├── 02-auth-enhancement.md
│   ├── 03-api-foundation.md
│   ├── 04-job-search.md
│   ├── 05-profile-cv.md
│   ├── 06-application-flow.md
│   ├── 07-job-posting.md
│   ├── 08-application-management.md
│   ├── 09-messaging.md
│   ├── 10-admin-dashboard.md
│   ├── 11-user-management.md
│   ├── 12-content-moderation.md
│   ├── 13-notification-system.md
│   └── 14-analytics-dashboard.md
│
├── BRANCH_PROTECTION.md       # Branch protection guide
├── CI_ENHANCED.md             # Enhanced CI guide
├── PROJECT_SETUP.md           # Project board guide
├── LABELS.yml                 # Labels reference
├── REVIEWERS.yml              # Reviewers config
└── MILESTONES.md              # Milestones definition
```

---

## 2. Setup Instructions

### Step 1: Create GitHub Labels

1. Go to repository **Settings** > **Labels**
2. Or use labeler bot

Reference: [labels.yml](labels.yml)

### Step 2: Enable Issue Templates

The templates are automatically picked up from `.github/ISSUE_TEMPLATE/`.

### Step 3: Create Project Board

1. Go to **Projects** > **New project**
2. Select **Board**
3. Create columns: Backlog, To Do, In Progress, In Review, Done

Reference: [PROJECT_SETUP.md](PROJECT_SETUP.md)

### Step 4: Setup Branch Protection

1. Go to **Settings** > **Branches**
2. Add rule for `main`
3. Add rule for `develop`

Reference: [BRANCH_PROTECTION.md](BRANCH_PROTECTION.md)

### Step 5: Create Milestones

```bash
# Using GitHub CLI
gh issue milestone create "M1 - Foundation" --due-date 2026-04-27
# ... (see MILESTONES.md for all milestones)
```

### Step 6: Create Issues from Templates

Import issues from `.github/ISSUES/` folder:
1. Create issue manually
2. Copy content from template
3. Assign labels and milestone

---

## 3. Workflow Summary

### Creating a New Feature

```bash
# 1. Create issue (or use template)
# Assign: labels, milestone, assignee

# 2. Create branch from develop
git checkout develop
git pull
git checkout -b feature/issue-14-analytics-dashboard

# 3. Implement feature
# Make commits with descriptive messages
git add .
git commit -m "feat(analytics): add admin analytics dashboard"
git commit -m "feat(analytics): add chart components"
git commit -m "fix(analytics): adjust chart responsiveness"

# 4. Push and create PR
git push -u origin feature/issue-14-analytics-dashboard

# 5. Create PR on GitHub
# Use PR template from ISSUE_TEMPLATE/pull_request_template.yml

# 6. Request review
# Assign 2 reviewers

# 7. Address feedback
# Push fixes

# 8. Merge after approval
# Delete branch after merge
```

### Issue Assignment Rules

| App/Package | Owner | Default Assignee |
|-------------|-------|-----------------|
| packages/db | Dev 1 | developer1 |
| packages/auth | Dev 1 | developer1 |
| packages/api | Dev 1 | developer1 |
| apps/candidate | Dev 2 | developer2 |
| apps/employer | Dev 3 | developer3 |
| apps/admin | Dev 4 | developer4 |
| shared/ui | Dev 2 | developer2 |
| notifications | Dev 4 | developer4 |

---

## 4. Team Communication

### Before Starting Work
- Check issue is assigned to you
- Check no one else is working on it
- Check dependencies are complete

### During Work
- Update issue status label
- Add progress comments
- Ask for help if blocked

### After Completion
- Ensure all tests pass
- Update issue with completion notes
- Request review

---

## 5. Quick Reference

### Branch Naming
```
feature/issue-{number}-{short-description}
fix/issue-{number}-{short-description}
chore/issue-{number}-{short-description}
```

### Commit Messages
```
feat(scope): add new feature
fix(scope): fix bug
refactor(scope): improve code
docs(scope): update docs
test(scope): add tests
chore(scope): maintenance
```

### PR Title Format
```
[Feature] Issue title
[Bugfix] Issue title
[Refactor] Issue title
```

### Labels Reference
- `app/*` - App ownership
- `shared/*` - Package ownership  
- `type/*` - Issue type
- `priority/*` - Priority level
- `size/*` - Estimated effort
- `status/*` - Status

---

## 6. Useful Links

- [GitHub Actions](https://docs.github.com/en/actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [Issue Templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)
- [Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects)

---

**Questions?** Create a discussion or ask your team lead.

**Last Updated:** 2026-04-13
