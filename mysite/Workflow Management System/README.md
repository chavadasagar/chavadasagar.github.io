# 🏢 HRM Application Foundation, Database, Auth, Users, Roles, Permissions, Workflows, Generic Engine, Leaves & Approval Inbox (Phase 13)

> Enterprise Human Resource Management (HRM) platform foundation built purely with **HTML5**, **CSS3**, **Vanilla JavaScript (ES6+)**, and **LocalStorage**. Zero external frameworks, zero bundlers, and zero backend dependencies.

---

## 🚀 Overview

This application provides a comprehensive client-side HRM platform with a relational LocalStorage database engine, seed data, Authentication & Session management (`current_session`), User Management, Role Management, Permission Management, Multiple Roles per User, Role Permissions & Authorization Engine (RBAC), Approval Workflow Master (`WorkflowService`, `ApprovalWorkflow`, `ApprovalWorkflowVersion`), Workflow Step Builder (`WorkflowStepService`, `ApprovalWorkflowStep`), Generic Approval Engine (`ApprovalEngine`, snapshotting, multi-stage state machine), Leave Request Integration (`LeaveService`, `Leave` entity, `#/leaves`), and a dedicated **Approval Inbox (`#/approvals`)** with visual timeline inspection, mandatory validation guards, and client-side security enforcement.

---

## 🛠️ Architecture & Project Structure

```text
Workflow Management System/
├── index.html                   # Semantic HTML5 Application Shell
├── README.md                    # Sub-project Documentation & Acceptance Evidence
│
├── css/
│   ├── variables.css            # Enterprise CSS variables (colors, typography, spacing, shadows)
│   ├── global.css               # Resets, base typography, accessible focus styles, utilities
│   ├── layout.css               # Sidebar navigation, top header, main content & auth viewport
│   ├── components.css           # Buttons, cards, tables, badges, forms, modal, toast, empty state
│   └── responsive.css           # Breakpoints & mobile drawer off-canvas handling
│
└── js/
    ├── storage.js               # DatabaseService & StorageService adapter (root: hrm_database)
    ├── router.js                # Protected Hash Router with route guards, RBAC & layout control
    ├── app.js                   # Application bootstrap & dependency wiring
    │
    ├── services/
    │   ├── authService.js       # Authentication, session lifecycle & ASP.NET isolation
    │   ├── userRoleService.js   # Many-to-many userRoles service & duplicate check
    │   ├── userService.js       # User CRUD, multi-role synchronization, soft deactivation
    │   ├── roleService.js       # Role CRUD, code uniqueness, referential deletion protection
    │   ├── permissionService.js # Permission retrieval, unique codes, module grouping
    │   ├── rolePermissionService.js # Many-to-many rolePermissions service & sync
    │   ├── authorizationService.js  # Central RBAC engine, multi-role union & bypass
    │   ├── workflowStepService.js   # Workflow steps, approver types, reordering & validation
    │   ├── workflowService.js       # Workflow CRUD, version management & publishing
    │   ├── approvalEngine.js        # Generic approval engine & state machine
    │   └── leaveService.js          # [NEW Phase 12] Leave requests, days calculation & status sync
    │
    ├── components/
    │   ├── sidebar.js           # Navigation sidebar with permission filtering & user chip
    │   ├── header.js            # Top header with dynamic user chip & confirmed Logout button
    │   ├── modal.js             # Accessible modal dialog service (dialogs, confirm, forms)
    │   └── toast.js             # Stackable, auto-dismissing toast notifications
    │
    └── pages/
        ├── login.js             # Authentication card with 1-click demo user credentials
        ├── dashboard.js         # Foundation dashboard, system metrics & UI verification suite
        ├── users.js             # User directory, multi-role selection UI & button guards
        ├── roles.js             # Role directory, module-grouped permission checklist & guards
        ├── permissions.js       # Permissions grouped by module, search/filter & matrix
        ├── workflows.js         # Approval workflows directory & version history modal
        ├── leaves.js            # [NEW Phase 12] Leave applications & pipeline status
        ├── approvals.js         # [NEW Phase 12] Approval decision inbox & delegation
        ├── accessDenied.js      # 403 Access Denied page for unauthorized routes
        ├── settings.js          # Database management, diagnostics & Reset Demo Database
        └── notFound.js          # Graceful 404 Not Found error page
```

---

## 🔑 Permission Entity Schema

Every permission entity adheres to the strict structure:
```json
{
  "id": "prm_8f2b3a1c9d0e",
  "name": "View Dashboard",
  "code": "dashboard.view",
  "module": "Dashboard",
  "description": "Access executive and personal dashboard metrics",
  "status": "Active",
  "createdAt": "2026-09-12T16:50:00.000Z"
}
```

---

## 📦 Permission Modules & Groups

Permissions are organized into 8 functional modules:

| Module | Code | Description |
|---|---|---|
| **Dashboard** | `dashboard.view` | View executive & KPI analytics |
| **Users** | `user.view` | View employee directory and user profiles |
| | `user.create` | Provision new employee accounts |
| | `user.edit` | Modify employee account details |
| | `user.delete` | Soft-deactivate or remove user accounts |
| **Roles** | `role.view` | View organizational roles |
| | `role.create` | Create custom organizational roles |
| | `role.edit` | Update role definitions |
| | `role.delete` | Delete unreferenced roles |
| | `permission.view` | Inspect permission matrix |
| **Workflow** | `workflow.view` | Inspect approval workflow templates |
| | `workflow.create` | Author multi-stage approval workflows |
| | `workflow.edit` | Modify approval rules and stages |
| | `workflow.publish` | Publish active workflow versions |
| **Approval** | `approval.view` | View pending approval queues |
| | `approval.approve` | Authorize and grant official approval |
| | `approval.reject` | Decline approval requests |
| | `approval.delegate` | Delegate approval authority |
| **Leave** | `leave.view` | View leave requests & balances |
| | `leave.create` | Submit paid time off or sick leave |
| | `leave.edit` | Update pending leave requests |
| | `leave.cancel` | Cancel submitted leave requests |
| **Expense** | `expense.view` | View expense claims & reports |
| | `expense.create` | Submit expense claims for reimbursement |
| **Audit** | `audit.view` | View security & compliance audit logs |

---

## 🛠️ PermissionService API (`js/services/permissionService.js`)

- `PermissionService.getAll()`: Retrieves all permissions with normalized structure and default `status: 'Active'`.
- `PermissionService.getById(id)`: Retrieves a specific permission record by ID.
- `PermissionService.getByCode(code)`: Retrieves a permission by exact or case-insensitive code.
- `PermissionService.getGroupedByModule()`: Groups permissions into an ordered dictionary categorized by the 8 standard functional modules.

---

## 👥 Multiple Roles per User Architecture (Phase 7)

### 1. Database Schema
Users maintain a true **Many-to-Many relationship** with Roles via the `userRoles` collection. The `user` object does **not** store a singular `user.roleId`.

```json
// userRoles entity in hrm_database
{
  "id": "ur_3a7b9c1e",
  "userId": "usr_sagar",
  "roleId": "role_mgr",
  "createdAt": "2026-09-13T10:00:00.000Z"
}
```

### 2. UserRoleService API (`js/services/userRoleService.js`)
- `getRolesForUser(userId)`: Resolves all role objects assigned to the specified user.
- `getUsersForRole(roleId)`: Resolves all user objects holding the specified role.
- `assignRole(userId, roleId)`: Assigns a role to a user with built-in **Duplicate Protection** (cannot assign same role twice).
- `removeRole(userId, roleId)`: Unassigns a specific role from a user.
- `setRoles(userId, roleIds)`: Synchronizes the complete set of roles for a user (adds new, removes unselected, prevents duplicates).
- `hasRole(userId, roleId)`: Returns boolean whether a user holds a particular role.

### 3. User Interface
- **User Edit Modal (`#/users`)**: Renders a multi-select checkbox group for all system roles (e.g. `[x] Employee`, `[x] Manager`, `[ ] HR Admin`, `[ ] Finance`).
- **User Create Modal (`#/users`)**: Supports multi-role selection upon initial user provisioning.
- **User List Table**: Displays multiple assigned roles as individual pills (e.g., `Employee`, `Manager`).
- **Role Details Modal (`#/roles`)**: Displays all assigned users linked through `userRoles`.

---

## ✅ Phase 7 Acceptance Criteria Verification

- [x] **User can have multiple roles**: Verified User A assigned both Employee and Manager roles simultaneously.
- [x] **Relational integrity maintained**: Stored in `userRoles` table; no `user.roleId` column.
- [x] **Duplicate protection**: Attempting to assign the same role twice is prevented by `UserRoleService`.
- [x] **Role removal & re-assignment**: Removing Manager leaves Employee; re-assigning Manager restores both.
- [x] **Persistence across refresh**: Data is stored in LocalStorage (`hrm_database`) and reloads seamlessly.
- [x] **Stop after this phase**: Scope boundary strictly maintained.

---

## 🛡️ Role Permissions & Authorization Engine (Phase 8 RBAC)

### 1. Architecture Overview
```text
User  ==[userRoles]==>  Roles  ==[rolePermissions]==>  Permissions
```

### 2. RolePermissionService (`js/services/rolePermissionService.js`)
- `getPermissionsForRole(roleId)`: Returns list of resolved permission objects for a role.
- `assignPermission(roleId, permissionId)`: Adds role-permission link with duplicate protection.
- `removePermission(roleId, permissionId)`: Unlinks a permission from a role.
- `setPermissions(roleId, permissionIds)`: Synchronizes assigned permissions for a role.

### 3. AuthorizationService (`js/services/authorizationService.js`)
- `hasRole(userId, roleCode)`: Verifies role membership by code.
- `getUserRoles(userId)`: Resolves all active roles assigned to the user.
- `getUserPermissions(userId)`: Computes the **mathematical UNION** of permissions from all assigned roles.
- `hasPermission(userId, permissionCode)`: Checks whether user has the permission. Centrally grants all permissions if user is `SUPER_ADMIN` or `ADMIN`.
- `can(permissionCode)`: Evaluates permission for the currently authenticated session user.

### 4. UI Authorization & Route Guards
- **Edit Role Modal**: Interactive permissions checklist grouped by the 8 modules (`Users`, `Roles`, `Workflow`, `Approval`, etc.).
- **Sidebar**: Filters and hides navigation items if the user lacks the required `*.view` permission.
- **Action Buttons**: Conditionally hides buttons:
  - Add User (`user.create`), Edit User/Password (`user.edit`), Deactivate (`user.delete`)
  - Add Role (`role.create`), Edit Role (`role.edit`), Delete Role (`role.delete`)
- **Route Authorization Guard**: Direct URL access to unauthorized pages (e.g. `#/users`, `#/approvals`) renders the dedicated `AccessDeniedPage` (403).

---

## ✅ Phase 8 Acceptance Criteria Verification

- [x] **User A (Employee only)**: Cannot access `#/approvals` (`can('approval.view') === false`); renders Access Denied.
- [x] **User B (Manager only)**: Can access `#/approvals` (`can('approval.view') === true`).
- [x] **User C (Employee + Manager)**: Union of permissions from both roles verified (`leave.create` + `approval.view` + `approval.approve`).
- [x] **Role Removal**: Removing `Manager` from User C causes approval permissions to immediately disappear (`can('approval.view') === false`).
- [x] **Central Super Admin Bypass**: Super Admin centrally granted all permissions across system without scattered conditional checks.
- [x] **Persistence across refresh**: Relational integrity of `rolePermissions` and `userRoles` verified across reload.
- [x] **Stop after this phase**: Scope boundary strictly maintained.

---

## ⚡ Approval Workflow Master & Versioning (Phase 9)

### 1. Entity Schemas

#### ApprovalWorkflow (`workflows`)
```json
{
  "id": "wf_7f8a9b0c",
  "code": "WF_LEAVE",
  "name": "Leave Approval",
  "entityType": "Leave",
  "description": "Standard multi-level employee leave request approval pipeline",
  "isActive": true,
  "createdAt": "2026-09-13T10:00:00.000Z",
  "updatedAt": "2026-09-13T10:30:00.000Z"
}
```

#### ApprovalWorkflowVersion (`workflowVersions`)
```json
{
  "id": "wfv_1a2b3c4d",
  "workflowId": "wf_7f8a9b0c",
  "versionNumber": 1,
  "status": "Published",
  "createdAt": "2026-09-13T10:00:00.000Z",
  "createdBy": "usr_admin"
}
```

### 2. Supported Entity Types
- `Leave`
- `Expense`
- `AttendanceCorrection`
- `EmployeeTransfer`
- `SalaryRevision`
- `PurchaseRequest`

### 3. Version Lifecycle & Publishing Rules
- **Lifecycle States**: `Draft` ➔ `Published` ➔ `Archived`.
- **Immutability Rule**: Published versions cannot be directly edited. Any modification requires generating a new version (`createVersion`) which begins in `Draft` status.
- **Single Published Release Rule**: Exactly **one** version can be in `Published` status per workflow at any given time. When a new version is published via `publishVersion(workflowId, versionId)`, any currently `Published` version automatically transitions to `Archived`.

### 4. WorkflowService API (`js/services/workflowService.js`)
- `getAll()`: Retrieves all workflows enriched with version lists, counts, and current/published versions.
- `getById(id)`: Fetches a single workflow with full version history.
- `create(data)`: Validates unique code, entity type, and provisions Version 1 (`Draft`).
- `update(id, data)`: Modifies metadata (`name`, `description`, `isActive`).
- `getVersions(workflowId)`: Returns all versions ordered descending by version number.
- `createVersion(workflowId)`: Increments version number (`max + 1`) and creates new `Draft`.
- `publishVersion(workflowId, versionId)`: Archives previous published version and publishes target release.
- `archiveVersion(workflowId, versionId)`: Sets version status to `Archived`.

---

## 🏗️ Workflow Step Builder (Phase 10)

### 1. Entity Schema: ApprovalWorkflowStep (`workflowSteps`)
```json
{
  "id": "wfs_4a8b2c1d",
  "workflowVersionId": "wfv_1a2b3c4d",
  "stepOrder": 1,
  "name": "Manager Approval",
  "approverType": "Manager",
  "approverValue": null,
  "isRequired": true,
  "minApprovals": 1,
  "allowReject": true,
  "allowDelegate": false,
  "createdAt": "2026-09-13T11:00:00.000Z"
}
```

### 2. Supported Approver Types
1. `Manager`: Direct reporting manager of the submitter.
2. `DepartmentHead`: Head of the applicant's department.
3. `HR`: Human Resources department administrator.
4. `SpecificEmployee`: A specifically assigned user (`approverValue` stores `userId`, validated against `db.users`).
5. `Role`: Any member holding the designated organizational role (`approverValue` stores `roleId`, validated against `db.roles`).

### 3. Builder UI Features
- **Visual Sequential Order**: Clean cards displaying `Step 1`, `Step 2`, `Step 3`... with approver badges, requirement status, and policy tags.
- **Add Step**: Modal form with dynamic fields for `SpecificEmployee` and `Role` selections.
- **Edit Step**: In-place modification of step name, approver configuration, and approval policies.
- **Delete Step**: Removes gate and automatically re-sequences remaining steps `1..N`.
- **Reorder Steps**: Top-to-bottom reordering using intuitive `▲ Move Up` and `▼ Move Down` controls.
- **Read-Only / Lock State**: When viewing `Published` or `Archived` versions, the Builder switches to a locked view with a warning banner and disables all edit/delete/add controls.

### 4. Publishing Validation Rules
A workflow version **cannot** be published if:
- It contains zero steps (`steps.length === 0`).
- Any step has an invalid `approverType`.
- A `SpecificEmployee` step references a non-existent or deleted employee ID.
- A `Role` step references a non-existent or deleted role ID.
- Steps contain duplicate or non-sequential `stepOrder` values.
- `minApprovals < 1`.

### 5. Strict Version Immutability
- Published and Archived workflow versions are **strictly immutable**.
- Direct programmatic calls to `createStep`, `updateStep`, `deleteStep`, or `reorderSteps` on a non-draft version are rejected with an explicit error: `"Version X is Published/Archived and cannot be modified."`
- Modifying a workflow requires branching a new version (`createVersion`), which inherits initial configuration as a fresh `Draft`.

---

## ✅ Phase 10 Acceptance Criteria Verification

- [x] **Create Workflow**: Created "Leave Approval" (`WF_LEAVE_APP`) with Version 1 (`Draft`).
- [x] **Sequential Steps Added**:
  1. `Step 1`: Name: "Manager Approval", Approver: `Manager`, Required: Yes, Min Approvals: 1
  2. `Step 2`: Name: "Department Head Approval", Approver: `DepartmentHead`, Required: Yes, Min Approvals: 1
  3. `Step 3`: Name: "HR Approval", Approver: `HR`, Required: Yes, Min Approvals: 1
- [x] **Draft Persistence Across Reload**: Steps and order verified to persist across full application reload.
- [x] **Publishing Validation**: Publishing an empty version is blocked. Validated 3-step pipeline publishes successfully.
- [x] **Published Version Immutability**:
  - Adding a step to published version: **Rejected** (`Version 1 is Published and cannot be modified`).
  - Editing a step on published version: **Rejected** (`Version 1 is Published and cannot be modified`).
  - Deleting a step on published version: **Rejected** (`Version 1 is Published and cannot be modified`).
  - Reordering steps on published version: **Rejected** (`Version 1 is Published and cannot be modified`).
  - All original steps remain pristine and unmodified.
- [x] **Stop after this phase**: Scope boundary strictly maintained. Zero Leave integration implemented yet.

---

## ⚙️ Generic Approval Engine (Phase 11)

### 1. Entity Schemas

#### ApprovalRequest (`approvalRequests`)
```json
{
  "id": "apr_8427ea06",
  "workflowId": "wf_test_req",
  "workflowVersionId": "wfv_test_req_1",
  "entityType": "TestRequest",
  "entityId": "1001",
  "requestedBy": "usr_alex",
  "currentStepId": "aprs_1",
  "status": "Pending",
  "submittedAt": "2026-09-13T11:30:00.000Z",
  "completedAt": null,
  "createdAt": "2026-09-13T11:30:00.000Z",
  "updatedAt": "2026-09-13T11:30:00.000Z"
}
```

#### ApprovalRequestStep (`approvalRequestSteps`)
```json
{
  "id": "aprs_1",
  "approvalRequestId": "apr_8427ea06",
  "workflowStepId": "wfs_1",
  "stepOrder": 1,
  "approverEmployeeIds": ["usr_elena"],
  "status": "Pending",
  "startedAt": "2026-09-13T11:30:00.000Z",
  "completedAt": null
}
```

#### ApprovalAction (`approvalActions`)
```json
{
  "id": "act_9b2a1c0d",
  "approvalRequestId": "apr_8427ea06",
  "approvalRequestStepId": "aprs_1",
  "workflowStepId": "wfs_1",
  "approverEmployeeId": "usr_elena",
  "action": "Approve",
  "comments": "Approved by reporting manager",
  "actionAt": "2026-09-13T11:35:00.000Z"
}
```

### 2. Core Engine Principles & Rules
- **Generic & Entity-Agnostic**: Works across any domain records purely via `entityType`, `entityId`, `workflowId`, and `workflowVersionId`. Contains 0 domain-specific or Leave-specific code.
- **Snapshot Rule**: Approvers are resolved once at the time of request submission and stored immutably in `ApprovalRequestStep.approverEmployeeIds`. They are never recalculated dynamically.
- **Multi-Stage State Machine**:
  - Request: `Pending` ➔ `Approved` | `Rejected` | `Cancelled`
  - Step: `Waiting` ➔ `Pending` ➔ `Approved` | `Rejected` | `Skipped`
- **Security & Authority Checks**:
  - Non-approvers are blocked from approving/rejecting.
  - Requesters are strictly forbidden from approving their own submissions (`requestedBy === approverId`).
  - Terminal states are immutable: `Approved` requests cannot be rejected; `Rejected` requests cannot be approved.
- **Rejection & Cascading Skip**: If any step is rejected, the entire request immediately transitions to `Rejected`, and all remaining waiting steps transition to `Skipped`.
- **Delegation Support**: Authorized approvers can delegate authority to other active colleagues.

---

## ✅ Phase 11 Acceptance Criteria Verification

- [x] **Entity-Agnostic Submission**: Submitted fake entity `entityType = TestRequest`, `entityId = 1001`.
- [x] **Record Creation**:
  - `ApprovalRequest` record created with status `Pending`.
  - `ApprovalRequestStep` records created (Step 1 `Pending`, Steps 2 & 3 `Waiting`).
- [x] **Snapshot Rule**: Approvers snapshot verified: Step 1 (`usr_elena`), Step 2 (`usr_sarah`), Step 3 (`usr_michael`).
- [x] **Security & Role Validation**:
  - Unauthorized user (`usr_stranger`) approval attempt: **Rejected** (`User is not an authorized approver for this step`).
  - Requester (`usr_alex`) self-approval attempt: **Rejected** (`Requester cannot approve their own request`).
- [x] **Step 1 Approval**: Elena approved Step 1 ➔ Step 1 becomes `Approved`, Step 2 becomes `Pending`, Step 3 remains `Waiting`.
- [x] **Step 2 Rejection**: Sarah rejected Step 2 ➔ Step 2 becomes `Rejected`, Request becomes `Rejected`, Step 3 transitions to `Skipped`.
- [x] **Terminal State Lock**: Approval attempt on already rejected request: **Rejected** (`Cannot approve request: status is Rejected`).
- [x] **Stop after this phase**: Scope boundary strictly maintained. Zero Leave integration implemented yet.

---

## 🏖️ Leave Request + Approval Integration (Phase 12)

### 1. Leave Entity Schema (`leaves`)
```json
{
  "id": "lev_a4888c48",
  "employeeId": "usr_alex",
  "leaveType": "Annual Leave",
  "startDate": "2026-10-01",
  "endDate": "2026-10-05",
  "totalDays": 5,
  "reason": "Family vacation trip to mountains",
  "status": "Approved",
  "approvalRequestId": "apr_9a4ea35f",
  "createdAt": "2026-09-13T12:00:00.000Z"
}
```

### 2. Architecture & Separation of Concerns
- **Generic Engine Integrity**: `ApprovalEngine` contains **zero** Leave-specific business logic. It continues operating purely via `entityType: "Leave"` and `entityId: leave.id`.
- **`LeaveService` Domain Logic**:
  - Validates date ranges (`endDate >= startDate`).
  - Automatically calculates `totalDays` (inclusive).
  - Validates employee existence and active status.
  - Automatically calls `ApprovalEngine.submitRequest(...)` upon leave creation.
  - Stores returned `approvalRequestId` inside the `Leave` record.
- **External Status Synchronization**:
  - Handled cleanly via `LeaveService.syncFromApprovalRequest(approvalRequestId)`.
  - When `ApprovalRequest.status` becomes `Approved` ➔ `Leave.status` updates to `Approved`.
  - When `ApprovalRequest.status` becomes `Rejected` ➔ `Leave.status` updates to `Rejected`.
  - When `ApprovalRequest.status` becomes `Cancelled` ➔ `Leave.status` updates to `Cancelled`.

### 3. Canonical Leave Approval Pipeline
The published `WF_LEAVE` workflow guides all employee leave requests through 3 sequential approval stages:
1. `Step 1`: **Reporting Manager** (`Manager`)
2. `Step 2`: **Department Head** (`DepartmentHead`)
3. `Step 3`: **Human Resources** (`HR`)

### 4. User Interfaces
- **My Leaves Page (`#/leaves`)**:
  - Leave history directory with status badges and current approval stage indicators.
  - Interactive "Apply for Leave" modal with dynamic date range & total working days counter.
  - "Pipeline Details" inspection modal displaying step-by-step progress and decision audit trail.
- **Approvals Inbox Page (`#/approvals`)**:
  - Live queue displaying requests awaiting the logged-in user's approval authority.
  - Direct actions: **Approve** (with comments), **Reject** (with comments), **Delegate** (to an active colleague), and **Info** (full audit history).
  - External synchronization automatically updates the domain entity upon action.

---

## ✅ Phase 12 Acceptance Criteria Verification

- [x] **Employee Leave Application**:
  - Logged in Employee Alex Rivera (`usr_alex`).
  - Created Leave: 5 days Annual Leave (`2026-10-01` to `2026-10-05`).
  - Verified `Leave` record created with status `Pending`.
  - Verified `ApprovalRequest` created with status `Pending`.
  - Verified Step 1 (`Manager Approval`) is `Pending` with Alex's manager Elena Rostova (`usr_elena`).
  - Verified Steps 2 & 3 are `Waiting`.
- [x] **Manager Approval**:
  - Logged in Manager Elena Rostova (`usr_elena`).
  - Approved Step 1 with comments.
  - Verified Step 1 becomes `Approved`.
  - Verified Step 2 (`Department Head Approval`) becomes `Pending` with Sarah Jenkins (`usr_sarah`).
  - Verified Leave status remains `Pending`.
- [x] **Department Head Approval**:
  - Logged in Department Head Sarah Jenkins (`usr_sarah`).
  - Approved Step 2 with comments.
  - Verified Step 2 becomes `Approved`.
  - Verified Step 3 (`HR Approval`) becomes `Pending` with Michael Chang (`usr_michael`).
  - Verified Leave status remains `Pending`.
- [x] **HR Approval**:
  - Logged in HR Michael Chang (`usr_michael`).
  - Approved Step 3 with comments.
  - Verified Step 3 becomes `Approved`.
  - Verified `ApprovalRequest` status becomes `Approved`.
  - Verified `Leave.status` successfully synchronized to `Approved`!
- [x] **Isolated Rejection Test**:
  - Employee submitted second leave.
  - Manager approved Step 1.
  - Department Head rejected Step 2.
  - Verified `ApprovalRequest` status became `Rejected`.
  - Verified `Leave.status` successfully synchronized to `Rejected`.
  - Verified Step 3 (HR) transitioned to `Skipped`.
- [x] **Stop**: Complete verification passed and stopped.

---

## 📥 Approval Inbox & Timeline (Phase 13)

### 1. Inbox Table Structure (`#/approvals`)
The pending approvals view displays requests waiting on the active user with the exact columns:
1. `Request Type`: Entity badge (e.g. `Leave`).
2. `Request ID`: Monospace identifier (e.g. `#1FE07492`).
3. `Employee`: Submitter name and employee code.
4. `Submitted Date`: Formatted submission date.
5. `Current Step`: Sequential stage (e.g. `Step 1: Manager Approval`).
6. `Status`: State badge (`Pending`).
7. `Actions`: `Approve`, `Reject`, `Delegate`, `Details`.

### 2. Approval Detail Screen & Visual Timeline
Clicking `Details` or the Request ID opens a comprehensive inspection modal featuring:
- **Request Information**: Submitter profile, workflow pipeline, submission timestamp, and full entity parameters (e.g. leave type, duration, dates, reason).
- **Sequential Stepper Timeline**:
  - `✓ Step 1: Manager Approval` — Completed (Date, Approver, Comments)
  - `✓ Step 2: Department Head Approval` — Completed (Date, Approver, Comments)
  - `● Step 3: HR Approval` — Active Pending (Authorized approvers)
  - `○ Step 4: Final Sign-off` — Waiting
  - `✕ Step` — Rejected
- **Embedded Decision Controls**: Active approvers can approve, reject, or delegate directly inside the details modal.

### 3. Action Validations & Strict Requirements
- **Reject Requires Comments**: Declining a request enforces non-empty comments. The action is blocked with an alert if comments are omitted.
- **Delegate Requires Employee & Reason**: Delegating authority requires selecting an active colleague and providing an explicit reason.
- **Client-Side Security**:
  - Non-approvers and requesters are prevented from seeing decision buttons (`Approve`, `Reject`, `Delegate`).
  - Programmatic guards in `ApprovalEngine` reject direct approval attempts by unauthorized users or requesters.

---

## ✅ Phase 13 Acceptance Criteria Verification

- [x] **Employee Submits Leave**: Employee Alex Rivera (`usr_alex`) submitted leave request.
- [x] **Manager Sees Request**: Manager Elena Rostova (`usr_elena`) sees request `#apr_1fe07492` in pending inbox (`getPendingApprovals('usr_elena')`).
- [x] **Employee Does NOT See Approval Action**:
  - Employee Alex has 0 pending items for own request in inbox (`getPendingApprovals('usr_alex')` is empty).
  - Direct approval attempt by employee is blocked (`Requester cannot approve their own request`).
- [x] **Manager Approves**: Manager Elena approves Step 1 with comments.
- [x] **Manager No Longer Sees Request As Pending**: Elena's inbox immediately cleared.
- [x] **Next Approver Sees Request**: Department Head Sarah Jenkins (`usr_sarah`) now sees request at Step 2 in her inbox.
- [x] **Rejection Validation**: Rejection without comments is blocked (`Rejection comments are mandatory`).
- [x] **Delegation Validation**: Delegation without employee or reason is blocked. Valid delegation successfully adds colleague and enables approval.
- [x] **Stop**: Complete verification passed and stopped.



