# GitHub Project Board - 07nghiep

## Project Setup Instructions

### Tạo Project Board mới

1. Trên GitHub repo, vào **Projects** > **New project**
2. Chọn template **Board**
3. Đặt tên: `07nghiep - Sprint Board`
4. Visibility: Private (Internal)

### Columns (cột mặc định)

| Column | Description | Automation |
|--------|-------------|------------|
| **Backlog** | Issues được đề xuất nhưng chưa sẵn sàng | - |
| **To Do** | Issues sẵn sàng được assign và làm | - |
| **In Progress** | Đang active trên 1 branch | Auto-add when issue moved |
| **In Review** | PR đã tạo, đang chờ review | Auto-add when PR opened |
| **Done** | Đã merge vào develop | Auto-add when PR merged |

### Automation Rules

#### Tự động thêm vào "In Progress" khi assign
```
When: Issue is assigned
Action: Move to "In Progress"
```

#### Tự động thêm vào "In Review" khi tạo PR
```
When: Pull request opened
Action: Move linked issue to "In Review"
```

#### Tự động thêm vào "Done" khi merge
```
When: Pull request merged
Action: Move issue to "Done" and close
```

### Project Views

#### 1. Sprint Board (mặc định)
- Group by: None
- Card size: Compact

#### 2. By Milestone
- Group by: Milestone
- Filter: No Milestone grouped separately

#### 3. By Assignee
- Group by: Assignee
- Filter: No Assignee grouped separately

#### 4. By Priority
- Group by: Labels (priority/*)
- Sort: priority/critical > priority/high > priority/medium > priority/low

### Management Rules

#### Weekly Sprint Planning
- Mỗi **thứ 2**, team lead review backlog
- Chọn issues cho sprint mới
- Assign cho members
- Move to "To Do"

#### Daily Standup
- Check "In Progress" column
- Update progress trong comments
- Unblock issues nếu có blockers

#### Sprint Review (thứ 6)
- Review tất cả issues trong "Done"
- Verify completion criteria
- Update milestones nếu cần

## GitHub Project v2 Configuration

### Nếu dùng Project v2 (GitHub Projects), tạo file này:

```yaml
# .github/project.yml
name: 07nghiep Sprint Board
body: |
  Sprint board for 07nghiep Job Board development.
  Team: 4 fullstack developers

views:
  - name: Sprint Board
    layout: board
    group_by: null
    sort_by: null
  
  - name: By Milestone
    layout: board
    group_by: milestone
    filter: |
      -no:milestone

  - name: My Issues
    layout: table
    filter: |
      assignee: @me
      -state: closed

  - name: Bug Triage
    layout: table
    filter: |
      label: type/bugfix
      -state: closed

fields:
  - name: Status
    type: single_select
    options:
      - name: Backlog
        color: gray
      - name: To Do
        color: blue
      - name: In Progress
        color: yellow
      - name: In Review
        - name: Done
        color: green

  - name: Priority
    type: single_select
    options:
      - name: Critical
        color: red
      - name: High
        color: orange
      - name: Medium
        color: blue
      - name: Low
        color: gray

  - name: Estimate
    type: text

  - name: Iteration
    type: iteration
    configuration:
      iterations:
        - title: Sprint 1
          start_date: YYYY-MM-DD
          duration: 14
        - title: Sprint 2
          start_date: YYYY-MM-DD
          duration: 14
```

## Quick Links

- [Open Issues](https://github.com/your-org/07nghiep/issues?q=is%3Aissue+is%3Aopen+no%3Amilestone)
- [Current Sprint](https://github.com/your-org/07nghiep/issues?q=is%3Aissue+milestone%3A%22Sprint+1%22)
- [Bugs](https://github.com/your-org/07nghiep/labels/type%2Fbugfix)
- [Needs Review](https://github.com/your-org/07nghiep/pulls?q=is%3Apr+is%3Aopen+review%3Arequired)
