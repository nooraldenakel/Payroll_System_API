# 💼 Payroll Insight Pro — Complete REST API Documentation

Comprehensive technical reference for all endpoints in the **Payroll Insight Pro** REST API. Built with **Kotlin 2.1**, **Ktor 3.0**, **Koin 4.0 (Dependency Injection)**, **PostgreSQL (JetBrains Exposed)**, and **JWT (HMAC256)**.

---

## 📑 Table of Contents

1. [Architecture & Dependency Injection (Koin)](#architecture--dependency-injection-koin)
2. [Authentication & Token Lifecycle](#authentication--token-lifecycle)
3. [Pre-Configured System Accounts](#pre-configured-system-accounts)
4. [Endpoints by Category](#endpoints-by-category)
   - [1. System & Health](#1-system--health)
   - [2. Authentication](#2-authentication)
   - [3. User Management (CRUD)](#3-user-management-crud)
   - [4. Payroll Periods](#4-payroll-periods)
   - [5. Employees & Salaries](#5-employees--salaries)
   - [6. Excel Roster Import & History](#6-excel-roster-import--history)
   - [7. Financial Reports & Analytics](#7-financial-reports--analytics)
   - [8. Compliance & Audit Trail](#8-compliance--audit-trail)
   - [9. System Settings & Dynamic Column Configuration](#9-system-settings--dynamic-column-configuration)
5. [UI & Excel Column Mapping Guide](#5-ui--excel-column-mapping-guide)
6. [Standard Error Responses](#6-standard-error-responses)

---

## Architecture & Dependency Injection (Koin)

The project follows Clean Architecture with dependency injection managed via **Koin 4.0**:

- **Core Module (`coreModule`):** `JwtService`, `ExcelParser`.
- **Repository Module (`repositoryModule`):** `IUserRepository`, `IPeriodRepository`, `IEmployeeRepository`, `IAuditLogRepository`, `IImportRepository`, `ISettingsRepository`, `IRefreshTokenRepository`.
- **Use Case Module (`useCaseModule`):** `CalculateSalaryUseCase`, `RecalculatePeriodStatsUseCase`, `ManageEmployeeUseCase`, `ReportAnalyticsUseCase`, `AuthUseCase`.

All components are declared as singletons in `AppModule.kt` and injected into Ktor routes using `by inject<T>()`.

---

## Authentication & Token Lifecycle

- **Access Token:** Valid for **24 hours** (`86,400,000 ms`). Carries user claims (`userId`, `email`, `name`, `role`, `type = "access"`).
- **Refresh Token:** Valid for **7 days**. Persisted in PostgreSQL (`refresh_tokens` table) to support token rotation and revocation.
- **Header Format:** Protected endpoints require:
  ```http
  Authorization: Bearer <accessToken>
  ```
- **Refresh Flow:** When the 24-hour access token expires, clients call `POST /api/auth/refresh` with the refresh token to receive a renewed 24-hour access token and a newly rotated refresh token.
- **Logout Flow:** Calling `POST /api/auth/logout` invalidates the active refresh token in PostgreSQL.

---

## Pre-Configured System Accounts

All seeded accounts have the initial password: **`admin123`** (BCrypt hashed in PostgreSQL).

| Name | Email | Role | Department / Description |
|---|---|---|---|
| **Aziz Sulaiman** | `admin@institution.gov` | Super Admin | Director General of Finance |
| **Sarah Jenkins** | `s.jenkins@institution.gov` | Senior Payroll Accountant | Payroll Operations Officer |
| **David Miller** | `d.miller@institution.gov` | Chief Compliance Auditor | Internal Audit & Statutory Inspection |
| **Fatima Al-Zahraa**| `f.alzahraa@institution.gov` | Disbursement Specialist | Bank Transfers & Disbursals |

---

## 1. System & Health

### 1.1. Service Catalog / Root Directory
Returns the service overview and dictionary of all available routes.

- **Method & URL:** `GET /`
- **Access Level:** Public (No token required)
- **Headers:** `Accept: application/json`

#### cURL Example:
```bash
curl -X GET http://localhost:8080/
```

#### Response (`200 OK`):
```json
{
  "service": "Payroll Insight Pro REST API",
  "version": "1.0.0",
  "status": "operational",
  "endpoints": {
    "authLogin": "/api/auth/login",
    "authRefresh": "/api/auth/refresh",
    "authProfile": "/api/auth/me",
    "authLogout": "/api/auth/logout",
    "periods": "/api/periods",
    "employees": "/api/employees",
    "excelUpload": "/api/employees/upload-excel?periodId={periodId}",
    "batchImport": "/api/employees/batch-import",
    "reportsSummary": "/api/reports/summary?periodId={periodId}",
    "departmentReports": "/api/reports/departments?periodId={periodId}",
    "currencyReports": "/api/reports/currency?periodId={periodId}",
    "auditLogs": "/api/audit-logs",
    "importHistory": "/api/imports",
    "settings": "/api/settings",
    "health": "/health",
    "seed": "/api/seed?reset=true"
  }
}
```

---

### 1.2. Health Check
Checks application status and database connectivity.

- **Method & URL:** `GET /health`
- **Access Level:** Public
- **Headers:** `Accept: application/json`

#### cURL Example:
```bash
curl -X GET http://localhost:8080/health
```

#### Response (`200 OK`):
```json
{
  "status": "UP",
  "database": "PostgreSQL (payroll_insight_db)",
  "timestamp": "2026-09-12T03:30:00"
}
```

---

### 1.3. Database Seeding & Reseeding
Checks database status. Pass query parameter `?reset=true` to wipe and re-seed clean, realistic enterprise records (users, active period `PR-2608`, employee roster, audit logs, and settings).

- **Method & URL:** `POST /api/seed` or `POST /api/seed?reset=true`
- **Access Level:** Public
- **Query Parameters:**
  - `reset` *(optional, boolean)*: `true` to force a clean enterprise reset.

#### cURL Example:
```bash
curl -X POST "http://localhost:8080/api/seed?reset=true"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Database reseeded successfully with real institutional roster, periods, and audit trail.",
  "data": {
    "success": true,
    "message": "Database reseeded with real enterprise records"
  }
}
```

---

## 2. Authentication

### 2.1. Institutional Login
Validates credentials against BCrypt password hash and issues a **24-hour access token** and **7-day refresh token**.

- **Method & URL:** `POST /api/auth/login`
- **Access Level:** Public
- **Headers:**
  - `Content-Type: application/json`
  - `Accept: application/json`

#### Request Body:
```json
{
  "email": "admin@institution.gov",
  "password": "admin123"
}
```

#### cURL Example:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@institution.gov","password":"admin123"}'
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Institutional authentication successful",
  "data": {
    "user": {
      "id": "u-1",
      "email": "admin@institution.gov",
      "name": "Aziz Sulaiman",
      "initials": "AS",
      "role": "Super Admin",
      "status": "Active",
      "avatar": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2.2. Refresh Access Token
Exchanges a valid 7-day refresh token for a newly generated 24-hour access token and rotated refresh token.

- **Method & URL:** `POST /api/auth/refresh`
- **Access Level:** Public
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### cURL Example:
```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(new)",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(rotated)",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(new)"
  }
}
```

---

### 2.3. Get Authenticated Profile
Retrieves the logged-in user profile from PostgreSQL based on the `userId` in the JWT token.

- **Method & URL:** `GET /api/auth/me`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": null,
  "data": {
    "id": "u-1",
    "email": "admin@institution.gov",
    "name": "Aziz Sulaiman",
    "initials": "AS",
    "role": "Super Admin",
    "status": "Active",
    "avatar": null
  }
}
```

---

### 2.4. Logout & Token Revocation
Invalidates the refresh token and ends the session.

- **Method & URL:** `POST /api/auth/logout`
- **Access Level:** Protected (`Bearer <accessToken>`)
- **Headers:** `Content-Type: application/json` (Optional)

#### Request Body (Optional):
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### cURL Example:
```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Session terminated and refresh tokens revoked successfully",
  "data": {
    "success": true,
    "message": "Session revoked"
  }
}
```

---

## 3. User Management (CRUD)

Institutional multi-user administration endpoints. Enables creating, reading, updating (roles, status, passwords), and deactivating/deleting staff members (Admins, Accountants, Auditors, Disbursers).

### 3.1. List All Users
Returns all provisioned users in the system.

- **Method & URL:** `GET /api/users`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X GET http://localhost:8080/api/users \
  -H "Authorization: Bearer <accessToken>"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": "u-1",
      "email": "admin@institution.gov",
      "name": "Aziz Sulaiman",
      "initials": "AS",
      "role": "Super Admin",
      "status": "Active",
      "avatar": null
    },
    {
      "id": "u-2",
      "email": "s.jenkins@institution.gov",
      "name": "Sarah Jenkins",
      "initials": "SJ",
      "role": "Accountant",
      "status": "Active",
      "avatar": null
    }
  ]
}
```

---

### 3.2. Get User By ID
Fetch details of an individual user profile.

- **Method & URL:** `GET /api/users/{id}`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X GET http://localhost:8080/api/users/u-1 \
  -H "Authorization: Bearer <accessToken>"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "u-1",
    "email": "admin@institution.gov",
    "name": "Aziz Sulaiman",
    "initials": "AS",
    "role": "Super Admin",
    "status": "Active",
    "avatar": null
  }
}
```

---

### 3.3. Create New User
Creates a new staff user account. Hashes the password using BCrypt (salt factor 10), initializes role and status, and logs a compliance audit record.

- **Method & URL:** `POST /api/users`
- **Access Level:** Protected (`Bearer <accessToken>`)
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "name": "Yousif Al-Karkhi",
  "email": "y.alkarkhi@institution.gov",
  "password": "SecurePassword2026!",
  "initials": "YK",
  "role": "Accountant",
  "status": "Active"
}
```

#### cURL Example:
```bash
curl -X POST http://localhost:8080/api/users \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Yousif Al-Karkhi",
    "email": "y.alkarkhi@institution.gov",
    "password": "SecurePassword2026!",
    "role": "Accountant",
    "status": "Active"
  }'
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "User account created successfully",
  "data": {
    "id": "USR-A1B2C3D4",
    "email": "y.alkarkhi@institution.gov",
    "name": "Yousif Al-Karkhi",
    "initials": "YA",
    "role": "Accountant",
    "status": "Active",
    "avatar": null
  }
}
```

---

### 3.4. Update User Profile or Reset Password
Updates profile properties (name, role, status) or resets the user password. If password is provided, it is securely re-hashed and all existing refresh tokens for the user are immediately revoked.

- **Method & URL:** `PATCH /api/users/{id}`
- **Access Level:** Protected (`Bearer <accessToken>`)
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "role": "Senior Payroll Accountant",
  "status": "Active",
  "password": "NewSecretPassword2026!"
}
```

#### cURL Example:
```bash
curl -X PATCH http://localhost:8080/api/users/USR-A1B2C3D4 \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"role\":\"Senior Payroll Accountant\"}"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "USR-A1B2C3D4",
    "email": "y.alkarkhi@institution.gov",
    "name": "Yousif Al-Karkhi",
    "initials": "YA",
    "role": "Senior Payroll Accountant",
    "status": "Active",
    "avatar": null
  }
}
```

---

### 3.5. Delete / Deactivate User
Terminates a user account, purges their credentials, revokes all active sessions, and records a security audit log. Prevents a user from deleting their own active account while logged in.

- **Method & URL:** `DELETE /api/users/{id}`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X DELETE http://localhost:8080/api/users/USR-A1B2C3D4 \
  -H "Authorization: Bearer <accessToken>"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "User deleted and active sessions revoked",
  "data": true
}
```

---

## 4. Payroll Periods

### 4.1. List All Payroll Periods
Returns all periods ordered chronologically descending.

- **Method & URL:** `GET /api/periods`
- **Access Level:** Protected (`Bearer <accessToken>`)
- **Query Parameters:**
  - `page` *(optional, integer, default: `1`)*: Page number to retrieve (1-based).
  - `pageSize` *(optional, integer, default: `10`)*: Number of period records per page.

#### cURL Example:
```bash
curl -X GET "http://localhost:8080/api/periods?page=1&pageSize=10" \
  -H "Authorization: Bearer <accessToken>"
```

#### Response (`200 OK` - Paginated):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "PR-2608",
        "name": "August 2026",
        "ref": "PR-2608-gov",
        "status": "Active",
        "employeesCount": 8,
        "totalPayroll": 17870000.0,
        "paidAmount": 7965000.0,
      "remainingAmount": 9905000.0,
      "processedCount": 4,
      "creator": "Aziz Sulaiman",
      "createdOn": "AUG 1, 2026",
      "month": "AUG",
      "year": 2026,
      "createdAt": "2026-09-12T03:11:59"
    },
    {
      "id": "PR-2609",
      "name": "September 2026",
      "ref": "PR-2609-gov",
      "status": "Draft",
      "employeesCount": 0,
      "totalPayroll": 0.0,
      "paidAmount": 0.0,
      "remainingAmount": 0.0,
      "processedCount": 0,
      "creator": "Aziz Sulaiman",
      "createdOn": "SEP 1, 2026",
      "month": "SEP",
      "year": 2026,
      "createdAt": "2026-09-12T03:11:59"
    ],
    "totalCount": 2,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

---

### 3.2. Get Payroll Period by ID
- **Method & URL:** `GET /api/periods/{id}`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X GET http://localhost:8080/api/periods/PR-2608 \
  -H "Authorization: Bearer <accessToken>"
```

---

### 3.3. Create Payroll Period
- **Method & URL:** `POST /api/periods`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### Request Body:
```json
{
  "name": "October 2026",
  "month": "OCT",
  "year": 2026,
  "status": "Draft",
  "creator": "Aziz Sulaiman"
}
```

#### cURL Example:
```bash
curl -X POST http://localhost:8080/api/periods \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"October 2026","month":"OCT","year":2026,"status":"Draft"}'
```

---

### 3.4. Update Payroll Period
- **Method & URL:** `PATCH /api/periods/{id}`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### Request Body:
```json
{
  "status": "Active",
  "name": "October 2026 - Official"
}
```

#### cURL Example:
```bash
curl -X PATCH http://localhost:8080/api/periods/PR-2609 \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"status":"Active"}'
```

---

### 3.5. Recalculate Period Aggregates
Recomputes `totalPayroll`, `paidAmount`, `remainingAmount`, and `processedCount` by aggregating the live employee roster for the period.

- **Method & URL:** `POST /api/periods/{id}/recalculate`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X POST http://localhost:8080/api/periods/PR-2608/recalculate \
  -H "Authorization: Bearer <accessToken>"
```

---

### 3.6. Delete Payroll Period
Deletes a period and cascades deletion to all enrolled employees.

- **Method & URL:** `DELETE /api/periods/{id}`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X DELETE http://localhost:8080/api/periods/PR-2607 \
  -H "Authorization: Bearer <accessToken>"
```

---

## 4. Employees & Salaries

### 4.1. Query Employees
Retrieve employee records with optional filtering.

- **Method & URL:** `GET /api/employees`
- **Access Level:** Protected (`Bearer <accessToken>`)
- **Query Parameters:**
  - `page` *(optional, integer, default: `1`)*: Page number to retrieve (1-based).
  - `pageSize` *(optional, integer, default: `10`)*: Number of employee records per page.
  - `periodId` *(optional, string)*: Filter by period ID (e.g. `PR-2608`).
  - `department` *(optional, string)*: Filter by department (e.g. `Engineering & Infrastructure`).
  - `salaryState` *(optional, string)*: Filter by disbursement state (`Paid`, `Not Yet`, `Stopped`, or `All`).
  - `search` *(optional, string)*: Search substring across Name, ID, and Department.

#### cURL Example:
```bash
curl -X GET "http://localhost:8080/api/employees?periodId=PR-2608&page=1&pageSize=10" \
  -H "Authorization: Bearer <accessToken>"
```

#### Response (`200 OK` - Paginated):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "EMP-1001",
        "periodId": "PR-2608",
        "name": "Tariq Al-Hashimi",
        "initials": "TA",
        "avatar": null,
        "type": "Full-Time",
        "department": "Engineering & Infrastructure",
        "baseSalary": 2500000.0,
        "bonus": 250000.0,
        "insurance": 75000.0,
        "absenceDays": 0,
        "absenceDeduction": 0.0,
        "searchingDocFee": null,
        "searchingDocFeeIqd": null,
        "isForeign": false,
        "currency": "Dinar",
        "hasRecruitmentFee": false,
        "recruitmentFee": null,
        "deductions": 75000.0,
        "netSalary": 2675000.0,
        "salaryState": "Paid",
        "paidAt": "2026-09-12T03:11:59",
        "status": "Active",
        "email": "t.alhashimi@institution.gov",
        "phone": "+964 770 123 4567",
        "joinDate": "2021-03-15",
        "paymentStatus": "Paid",
        "createdAt": "2026-09-12T03:11:59"
      }
    ],
    "totalCount": 8,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

---

### 4.2. Get Employee by ID
- **Method & URL:** `GET /api/employees/{id}`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X GET http://localhost:8080/api/employees/EMP-1001 \
  -H "Authorization: Bearer <accessToken>"
```

---

### 4.3. Enroll Employee
Enrolls a new employee, calculates deductions and net salary automatically, and updates the period's aggregate totals.

- **Method & URL:** `POST /api/employees`
- **Access Level:** Protected (`Bearer <accessToken>`)
- **Headers:** `Content-Type: application/json`

#### Request Body (Local Employee - IQD):
```json
{
  "periodId": "PR-2608",
  "name": "Ahmed Hassan",
  "department": "Engineering & Infrastructure",
  "baseSalary": 2200000.0,
  "bonus": 150000.0,
  "insurance": 60000.0,
  "absenceDays": 0,
  "absenceDeduction": 0.0,
  "isForeign": false,
  "currency": "Dinar",
  "email": "a.hassan@institution.gov",
  "phone": "+964 779 111 2233"
}
```

#### Request Body (Foreign Consultant - USD):
```json
{
  "periodId": "PR-2608",
  "name": "Jean-Pierre Laurent",
  "department": "Technical Advisory",
  "baseSalary": 4000.0,
  "bonus": 300.0,
  "insurance": 150.0,
  "searchingDocFee": 100.0,
  "hasRecruitmentFee": true,
  "recruitmentFee": 200.0,
  "isForeign": true,
  "currency": "USD"
}
```

#### cURL Example:
```bash
curl -X POST http://localhost:8080/api/employees \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"periodId":"PR-2608","name":"Ahmed Hassan","department":"Engineering & Infrastructure","baseSalary":2200000.0,"bonus":150000.0,"insurance":60000.0,"currency":"Dinar"}'
```

---

### 4.4. Replace / Full Update Employee Record
Performs a full record update (`PUT`). All fields are provided, deductions and net salary are recalculated, period totals are updated, and an audit event is logged.

- **Method & URL:** `PUT /api/employees/{id}`
- **Access Level:** Protected (`Bearer <accessToken>`)
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "periodId": "PR-2608",
  "name": "Mustafa Kamal Al-Bayati",
  "department": "Engineering & Infrastructure",
  "type": "Full-Time",
  "baseSalary": 2500000.0,
  "bonus": 300000.0,
  "insurance": 75000.0,
  "absenceDays": 1,
  "absenceDeduction": 50000.0,
  "isForeign": false,
  "currency": "Dinar",
  "email": "m.kamal@institution.gov",
  "phone": "+964 778 901 2345"
}
```

#### cURL Example:
```bash
curl -X PUT http://localhost:8080/api/employees/EMP-1001 \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"periodId":"PR-2608","name":"Mustafa Kamal Al-Bayati","department":"Engineering & Infrastructure","type":"Full-Time","baseSalary":2500000.0,"bonus":300000.0,"insurance":75000.0,"absenceDays":1,"absenceDeduction":50000.0,"currency":"Dinar"}'
```

---

### 4.5. Partial Update Employee
Updates individual fields of an employee record (`PATCH`).

- **Method & URL:** `PATCH /api/employees/{id}`
- **Access Level:** Protected (`Bearer <accessToken>`)
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "bonus": 300000.0,
  "absenceDays": 1,
  "absenceDeduction": 70000.0
}
```

#### cURL Example:
```bash
curl -X PATCH http://localhost:8080/api/employees/EMP-1001 \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"bonus":300000.0}'
```

---

### 4.5. Toggle Salary Disbursement State
Toggles or explicitly sets payment state between `Paid`, `Not Yet`, and `Stopped`.

- **Method & URL:** `POST /api/employees/{id}/toggle-payment`
- **Access Level:** Protected (`Bearer <accessToken>`)
- **Headers:** `Content-Type: application/json` (Optional)

#### Request Body:
```json
{
  "nextState": "Paid"
}
```

#### cURL Example:
```bash
curl -X POST http://localhost:8080/api/employees/EMP-1005/toggle-payment \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"nextState":"Paid"}'
```

---

### 4.6. Delete / Terminate Employee Record
- **Method & URL:** `DELETE /api/employees/{id}`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X DELETE http://localhost:8080/api/employees/EMP-1001 \
  -H "Authorization: Bearer <accessToken>"
```

---

### 4.7. Batch Import Employees (JSON)
Imports a list of employees in a single transactional request.

- **Method & URL:** `POST /api/employees/batch-import`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### Request Body:
```json
{
  "periodId": "PR-2608",
  "employees": [
    {
      "name": "Bilal Karim",
      "department": "Operations",
      "baseSalary": 1400000.0,
      "bonus": 100000.0,
      "insurance": 45000.0,
      "currency": "Dinar"
    },
    {
      "name": "Samira Adel",
      "department": "Human Resources",
      "baseSalary": 1600000.0,
      "bonus": 120000.0,
      "insurance": 50000.0,
      "currency": "Dinar"
    }
  ]
}
```

---

## 5. Excel Roster Import & History

### 5.1. Upload Excel Roster (`.xlsx` / `.xls`)
Parses an Excel spreadsheet, detects employee names, departments, salary figures, deductions, and foreign flags, enrolls them into the period, and recalculates period financial totals.

- **Method & URL:** `POST /api/employees/upload-excel?periodId={periodId}`
- **Access Level:** Protected (`Bearer <accessToken>`)
- **Query Parameter:** `periodId` *(required)*
- **Content-Type:** `multipart/form-data`

#### cURL Example:
```bash
curl -X POST "http://localhost:8080/api/employees/upload-excel?periodId=PR-2608" \
  -H "Authorization: Bearer <accessToken>" \
  -F "file=@test_roster.xlsx"
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Excel roster imported: 8 employees enrolled into period PR-2608",
  "data": {
    "importedCount": 8,
    "periodId": "PR-2608",
    "totalPayrollUpdated": 0.0,
    "message": "Import completed with 0 errors"
  }
}
```

---

### 5.2. View Import History
- **Method & URL:** `GET /api/imports`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X GET http://localhost:8080/api/imports \
  -H "Authorization: Bearer <accessToken>"
```

---

### 5.3. Clear Import History
- **Method & URL:** `DELETE /api/imports` (all) or `DELETE /api/imports?id={id}` (single)
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X DELETE http://localhost:8080/api/imports \
  -H "Authorization: Bearer <accessToken>"
```

---

## 6. Financial Reports & Analytics

### 6.1. Period Summary Report
Returns total net payroll, paid amount, remaining amount, and disbursement completion rate %.

- **Method & URL:** `GET /api/reports/summary?periodId={periodId}`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X GET "http://localhost:8080/api/reports/summary?periodId=PR-2608" \
  -H "Authorization: Bearer <accessToken>"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "periodId": "PR-2608",
    "periodName": "August 2026",
    "totalEmployees": 8,
    "paidEmployees": 4,
    "pendingEmployees": 3,
    "stoppedEmployees": 1,
    "totalPayroll": 17870000.0,
    "paidAmount": 7965000.0,
    "remainingAmount": 9905000.0,
    "completionRate": 44.57,
    "totalSearchFeeIqd": 0.0,
    "totalSearchFeeUsd": 270.0,
    "totalRecruitmentFee": 550.0,
    "totalAbsenceDeductions": 180000.0
  }
}
```

---

### 6.2. Department Expense Breakdown
Aggregates headcount and total payroll expense per department.

- **Method & URL:** `GET /api/reports/departments?periodId={periodId}`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X GET "http://localhost:8080/api/reports/departments?periodId=PR-2608" \
  -H "Authorization: Bearer <accessToken>"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "department": "Engineering & Infrastructure",
      "headcount": 1,
      "totalPayroll": 2675000.0,
      "averageSalary": 2675000.0,
      "percentage": 14.97
    },
    {
      "department": "Legal Affairs",
      "headcount": 1,
      "totalPayroll": 2310000.0,
      "averageSalary": 2310000.0,
      "percentage": 12.93
    }
  ]
}
```

---

### 6.3. Currency Split Report (IQD vs USD)
Separates local currency employees (IQD) from foreign experts (USD) with exchange rate conversion.

- **Method & URL:** `GET /api/reports/currency?periodId={periodId}`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X GET "http://localhost:8080/api/reports/currency?periodId=PR-2608" \
  -H "Authorization: Bearer <accessToken>"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "localEmployeesCount": 6,
    "foreignEmployeesCount": 2,
    "localPayrollIqd": 11000000.0,
    "foreignPayrollUsd": 8000.0,
    "foreignPayrollIqdEquiv": 10480000.0,
    "totalPayrollIqdCombined": 21480000.0,
    "usdExchangeRate": 1310.0
  }
}
```

---

## 7. Compliance & Audit Trail

### 7.1. Query Audit Logs
- **Method & URL:** `GET /api/audit-logs`
- **Access Level:** Protected (`Bearer <accessToken>`)
- **Query Parameters:**
  - `category` *(optional, string)*: Filter by `System`, `Employee`, `Salary`, or `Import`.
  - `limit` *(optional, int)*: Maximum log entries to return (default: `100`).

#### cURL Example:
```bash
curl -X GET "http://localhost:8080/api/audit-logs?limit=5" \
  -H "Authorization: Bearer <accessToken>"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "AUD-1001",
      "time": "09:00 today",
      "action": "Period Activated",
      "user": "Aziz Sulaiman",
      "detail": "Activated institutional payroll period PR-2608 (August 2026)",
      "icon": "calendar_today",
      "badgeColor": "bg-emerald-50 text-emerald-700 border border-emerald-200",
      "category": "System",
      "createdAt": "2026-09-12T03:11:59"
    }
  ]
}
```

---

### 7.2. Create Compliance Audit Entry
- **Method & URL:** `POST /api/audit-logs`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### Request Body:
```json
{
  "action": "Manual Salary Adjustment",
  "detail": "Adjusted bonus for senior engineer following performance review",
  "category": "Salary",
  "employeeId": "EMP-1001",
  "employeeName": "Tariq Al-Hashimi"
}
```

---

## 9. System Settings & Dynamic Column Configuration

### 9.1. Get Institutional Settings
- **Method & URL:** `GET /api/settings`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X GET http://localhost:8080/api/settings \
  -H "Authorization: Bearer <accessToken>"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "default",
    "institutionName": "General Directorate of Municipalities & Public Works",
    "institutionCode": "GOV-IQ-FIN-2026-HQ",
    "institutionType": "Government Ministry (Public Sector)",
    "fiscalYear": "FY 2026 – 2027",
    "defaultCurrency": "Dinar (IQD)",
    "usdToDinarRate": 1310.0,
    "sealWatermarkEnabled": true,
    "sealQrEnabled": true,
    "sessionTimeoutMinutes": 15,
    "multiCurrency": true,
    "twoFactorAuth": true
  }
}
```

---

### 9.2. Update Institutional Settings
- **Method & URL:** `PATCH /api/settings`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### Request Body:
```json
{
  "usdToDinarRate": 1320.0,
  "sessionTimeoutMinutes": 30
}
```

#### cURL Example:
```bash
curl -X PATCH http://localhost:8080/api/settings \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"usdToDinarRate":1320.0}'
```

---

### 9.3. Get Dynamic Table Columns & Excel Mappings
Returns the ordered list of all columns configured for employee tables and Excel import parsing. Each column specifies whether it is visible in the UI, required for payroll calculation, and what header aliases (English & Arabic) match it in uploaded Excel workbooks.

- **Method & URL:** `GET /api/settings/columns`
- **Access Level:** Protected (`Bearer <accessToken>`)

#### cURL Example:
```bash
curl -X GET http://localhost:8080/api/settings/columns \
  -H "Authorization: Bearer <accessToken>"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "key": "id",
      "label": "Employee ID",
      "type": "Text",
      "visible": true,
      "required": false,
      "excelAliases": ["Employee ID", "Emp ID", "الرقم الوظيفي", "رقم الموظف", "ID"]
    },
    {
      "key": "name",
      "label": "Full Name",
      "type": "Text",
      "visible": true,
      "required": true,
      "excelAliases": ["Full Name", "Employee Name", "اسم الموظف", "الاسم الكامل", "Name"]
    },
    {
      "key": "department",
      "label": "Department",
      "type": "Text",
      "visible": true,
      "required": true,
      "excelAliases": ["Department", "القسم", "الدائرة", "المديرية", "Dept"]
    },
    {
      "key": "baseSalary",
      "label": "Base Salary",
      "type": "Currency",
      "visible": true,
      "required": true,
      "excelAliases": ["Base Salary", "الراتب الاسمي", "الراتب الأساسي", "Basic Salary", "Salary"]
    },
    {
      "key": "bonus",
      "label": "Allowances & Bonus",
      "type": "Currency",
      "visible": true,
      "required": false,
      "excelAliases": ["Bonus", "المخصصات", "مكافأة", "Allowances", "Overtime"]
    },
    {
      "key": "netSalary",
      "label": "Net Salary",
      "type": "Currency",
      "visible": true,
      "required": false,
      "excelAliases": ["Net Salary", "صافي الراتب", "صافي الاستحقاق", "Net Pay"]
    }
  ]
}
```

---

### 9.4. Update Column Visibility & Excel Mappings
Allows admins and accountants to customize which columns appear in UI tables, reorder columns, change display labels, and add custom Excel header aliases matching any spreadsheet layout.

- **Method & URL:** `PUT /api/settings/columns`
- **Access Level:** Protected (`Bearer <accessToken>`)
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "columns": [
    {
      "key": "id",
      "label": "Employee ID",
      "type": "Text",
      "visible": true,
      "required": false,
      "excelAliases": ["Emp ID", "الرقم الوظيفي"]
    },
    {
      "key": "name",
      "label": "Employee Name",
      "type": "Text",
      "visible": true,
      "required": true,
      "excelAliases": ["Full Name", "اسم الموظف"]
    },
    {
      "key": "searchingDocFee",
      "label": "Audit Inspection Fee",
      "type": "Currency",
      "visible": false,
      "required": false,
      "excelAliases": ["Inspection Fee", "رسوم التفتيش"]
    }
  ]
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Table column configurations and Excel mappings updated successfully",
  "data": [
    {
      "key": "id",
      "label": "Employee ID",
      "type": "Text",
      "visible": true,
      "required": false,
      "excelAliases": ["Emp ID", "الرقم الوظيفي"]
    }
  ]
}
```

---

## 5. UI & Excel Column Mapping Guide

### How UI Users Select Columns & How Excel Header Matching Works

A frequent requirement in enterprise payroll systems is handling different departments or ministries that supply Excel sheets with varying column names (e.g. one department names a column *"الراتب الاسمي"*, another writes *"الراتب الأساسي"*, and another writes *"Basic Salary"*).

Payroll Insight Pro handles this via a **Dynamic Column Schema**:

```
 ┌────────────────────────────────────────────────────────┐
 │                   User UI Settings                     │
 │  [x] Employee ID    [x] Name       [x] Department      │
 │  [x] Base Salary    [ ] Phone      [x] Net Salary      │
 └──────────────────────────┬─────────────────────────────┘
                            │ PUT /api/settings/columns
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │           PostgreSQL: dynamic_fields_json              │
 │ Stores: key, label, visible, required, excelAliases    │
 └──────────────────────────┬─────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
 ┌─────────────────────┐         ┌─────────────────────┐
 │    UI Data Grid     │         │ Excel Upload Parser │
 │ Only displays       │         │ Matches Excel header│
 │ columns where       │         │ against configured  │
 │ visible == true     │         │ excelAliases array  │
 └─────────────────────┘         └─────────────────────┘
```

#### 1. In the Web UI (Frontend):
1. On initial page load or when visiting **Settings > Column Preferences**, the UI calls `GET /api/settings/columns`.
2. The UI renders a **Column Manager Modal** with checkboxes for each column:
   - Toggling the checkbox sets `visible = true/false`.
   - Dragging a row changes the column display order.
   - Editing the text changes `label`.
   - Adding comma-separated tags adds new `excelAliases`.
3. The user clicks **Save Preferences**, sending `PUT /api/settings/columns`.
4. The Employee Roster table immediately filters its `<th>` and `<td>` headers to only render columns where `visible === true`.

#### 2. During Excel File Upload:
1. When a user uploads an `.xlsx` workbook to `POST /api/roster/import`, the backend `ExcelParser` inspects row 0 / the header row.
2. For each cell header in the Excel file, the parser iterates over the configured `excelAliases`.
3. If an Excel header matches any alias in `column.excelAliases` (case-insensitive, whitespace-trimmed), that column's data is mapped to the internal field `column.key`.
4. If a file has custom header names not yet recognized, the user simply adds the header title into the column's `excelAliases` in the UI settings, without any code modifications or redeployment!

---

---

## Standard Error Responses

### `401 Unauthorized`
Returned when a protected endpoint is accessed without a token, or with an invalid/expired token:
```json
{
  "success": false,
  "message": "Access denied. Authentication required or access token has expired.",
  "data": null
}
```

### `404 Not Found`
Returned when an entity (period, employee, or user) does not exist:
```json
{
  "success": false,
  "message": "Endpoint not found: /api/invalid-route",
  "data": null
}
```

### `400 Bad Request`
Returned when required fields are missing:
```json
{
  "success": false,
  "message": "Missing periodId or employee name",
  "data": null
}
```
