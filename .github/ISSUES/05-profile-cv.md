# Issue #5: Candidate Profile & CV

## Metadata
- **Issue Number:** #5
- **Labels:** `app/candidate`, `type/feature`, `priority/high`, `size/m`
- **Assignee:** Dev 2 (Candidate App Lead)
- **Milestone:** M2 - Candidate MVP
- **Epic:** Candidate Features
- **Estimate:** 10-12h

## Problem Statement

Candidates need a comprehensive profile page where they can showcase their skills, experience, education, and upload their CV/resume. A complete profile increases their chances of getting hired.

## Requirements

### 1. Profile Edit Page

Route: `/profile/edit`

**Sections:**

1. **Basic Info**
   - Avatar upload
   - Headline (professional title)
   - Full name
   - Email (read-only)
   - Phone
   - Location

2. **About Me**
   - Summary/bio (rich text, max 2000 chars)
   - Character counter

3. **Skills**
   - Tag input with autocomplete
   - Skill suggestions from database
   - Remove/add skills easily

4. **Work Experience**
   - Add/remove/edit entries
   - Fields: Title, Company, Location, Start Date, End Date, Current, Description
   - Drag to reorder (optional)
   - Rich text for descriptions

5. **Education**
   - Add/remove/edit entries
   - Fields: Degree, School, Location, Start Year, End Year, GPA (optional)

6. **Resume/CV**
   - Upload PDF (max 5MB)
   - Preview capability
   - Replace existing
   - Delete option

7. **Portfolio**
   - LinkedIn URL
   - GitHub URL
   - Personal website URL
   - Portfolio URL

### 2. Profile View Page

Route: `/profile` (public view)

Display:
- Avatar and basic info
- Headline
- Skills badges
- Experience timeline
- Education timeline
- Download resume button (if public)
- Contact button (if employer viewing)

### 3. Profile Completeness Indicator

Progress bar showing:
- Basic info complete
- Skills added
- Experience added
- Education added
- Resume uploaded

### 4. Avatar Upload

- Crop/resize before upload
- Preview before saving
- Supported formats: JPG, PNG, WebP
- Max size: 2MB
- Recommended size: 400x400px

## Tasks Checklist

```markdown
- [ ] 1. Create profile edit route /profile/edit
- [ ] 2. Create avatar upload component
- [ ] 3. Create basic info form section
- [ ] 4. Create about/summary section
- [ ] 5. Create skills tag input
- [ ] 6. Create experience form (add/edit/remove)
- [ ] 7. Create education form (add/edit/remove)
- [ ] 8. Create resume upload component
- [ ] 9. Create profile view page
- [ ] 10. Create completeness indicator
- [ ] 11. Add form validation
- [ ] 12. Auto-save functionality
- [ ] 13. Unsaved changes warning
```

## Files to Create

```
apps/candidate/src/
├── routes/
│   ├── profile.edit.tsx      # Edit profile
│   └── profile.tsx          # View profile
├── components/
│   ├── profile/
│   │   ├── avatar-upload.tsx
│   │   ├── basic-info-form.tsx
│   │   ├── about-form.tsx
│   │   ├── skills-input.tsx
│   │   ├── experience-form.tsx
│   │   ├── education-form.tsx
│   │   ├── resume-upload.tsx
│   │   ├── profile-preview.tsx
│   │   └── completeness-indicator.tsx
```

## Files to Modify

```
apps/candidate/src/routes/__root.tsx
apps/candidate/src/components/header.tsx  # Add Profile link
apps/candidate/src/components/user-menu.tsx
```

## API Endpoints Needed

```typescript
// Already created in #3 (API Foundation)
// Need to extend:

profile.update: candidateProcedure.input(profileUpdateSchema).mutation(...)
profile.uploadAvatar: candidateProcedure.input(uploadSchema).mutation(...)
profile.uploadResume: candidateProcedure.input(uploadSchema).mutation(...)
profile.deleteResume: candidateProcedure.mutation(...)
```

## Design Notes

### Profile Completeness Bar
```
┌──────────────────────────────────────────┐
│ Profile Completeness                      │
│ ████████████░░░░░░░░░░░░░░░░░  45%       │
│                                          │
│ ✓ Basic Info        [Incomplete] Skills  │
│ ✓ About             [Missing] Experience │
│ ✓ Education         [Missing] Resume     │
└──────────────────────────────────────────┘
```

### Experience Entry
```
┌─────────────────────────────────────────┐
│ Software Engineer                        │
│ Tech Company Inc. • Ho Chi Minh City     │
│ Jan 2020 - Present (4 years)            │
│                                         │
│ Developed web applications using React.. │
│                                         │
│ [Edit]                    [Remove]      │
└─────────────────────────────────────────┘
```

## Dependencies

- **Blocked By:** 
  - #3 (API Foundation) - need profile APIs
  - File upload infrastructure

## Success Criteria

1. All profile sections editable
2. Avatar upload with preview
3. Skills can be added/removed
4. Experience entries can be added/edited/removed
5. Education entries can be added/edited/removed
6. Resume can be uploaded/downloaded
7. Profile completeness indicator accurate
8. Form validation prevents invalid data
9. Unsaved changes prompt on navigation

## Related Issues

- #3 (API Foundation) - prerequisite
- #4 (Job Search) - uses profile for applications
- #6 (Application Flow) - uses profile for applying
