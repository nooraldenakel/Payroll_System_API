# 💼 Payroll Insight Pro — REST API (Ktor & PostgreSQL)

High-performance, asynchronous REST API for government and corporate payroll intelligence. Built with **Kotlin 2.1**, **Ktor 3.0**, **Clean Architecture**, **Koin 4.0 (Dependency Injection)**, **JetBrains Exposed ORM**, **Apache POI**, and **PostgreSQL**.

> 📖 **Full API Reference Manual:** See **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** for exhaustive details on all 31 endpoints, JSON payloads, and cURL commands.

---

## 🏛️ Architecture (Clean Architecture & Koin DI)

```
src/main/kotlin/com/payroll/
├── di/                          # Koin Dependency Injection
│   └── AppModule.kt             # Core, Repository, and UseCase modules
├── domain/                      # Enterprise Business Rules & Models
│   ├── models/Models.kt         # Domain DTOs, Requests, Responses, and Analytics Models
│   ├── repository/Interfaces.kt # Repository contracts (IEmployeeRepo, IPeriodRepo, etc.)
│   └── usecase/SalaryUseCases.kt# Core business rules (Salary, ManageEmployee, Auth, etc.)
├── data/                        # Data & Infrastructure Layer
│   ├── database/Tables.kt       # Exposed Table Definitions (PostgreSQL)
│   ├── database/DatabaseFactory.kt # HikariCP pool, migrations, and auto-seeding
│   ├── repository/RepositoriesImpl.kt # Concrete repository implementations
│   └── excel/ExcelParser.kt     # Apache POI Excel (.xlsx/.xls) parsing engine
├── security/                    # JWT Engine
│   └── JwtService.kt            # 24h Access Token & 7d Refresh Token generator
├── routes/                      # Presentation Layer (HTTP Route Handlers)
│   ├── AuthRoutes.kt            # Login, token refresh, logout, profile
│   ├── UserRoutes.kt            # User CRUD: Create, update, list, delete staff
│   ├── PeriodRoutes.kt          # Payroll periods management
│   ├── EmployeeRoutes.kt        # Employees, salary states, batch import
│   ├── ExcelImportRoutes.kt     # Multipart Excel upload & import history
│   ├── ReportsRoutes.kt         # Financial summaries, departments, currency split
│   ├── AuditLogRoutes.kt        # Compliance audit trail
│   ├── SettingsRoutes.kt        # Institutional config, USD rate & dynamic columns
│   └── SystemRoutes.kt          # Root catalog, health check, seed
├── plugins/                     # Ktor Server Plugins
│   ├── Koin.kt                  # Koin container initialization
│   ├── Security.kt              # JWT Bearer authentication filter
│   ├── Routing.kt               # Route registry with Koin injections
│   ├── Serialization.kt         # Kotlinx JSON negotiation
│   ├── HTTP.kt                  # CORS & CallLogging
│   └── StatusPages.kt           # Centralized exception handling
└── Application.kt               # Netty engine entry point
```

---

## 🧮 Salary Calculation Rules

1. **Net Salary:**
   $$\text{Net Salary} = \max\Big(0,\; (\text{baseSalary} - \text{recruitmentFee}) + \text{bonus} - \text{insurance} - \text{absenceDeduction} - \text{searchingDocFee}\Big)$$
2. **Total Deductions:**
   $$\text{Total Deductions} = \text{recruitmentFee} + \text{insurance} + \text{absenceDeduction} + \text{searchingDocFee}$$
3. **Foreign Fee IQD Equivalence:**
   $$\text{searchingDocFeeIqd} = \text{round}(\text{searchingDocFee} \times \text{usdToDinarRate})$$
4. **Period Aggregates:**
   $$\text{totalPayroll} = \sum \text{netSalary}, \quad \text{paidAmount} = \sum_{\text{state}=\text{'Paid'}} \text{netSalary}, \quad \text{remainingAmount} = \text{totalPayroll} - \text{paidAmount}$$

---

## 🚀 Getting Started

### 1. Prerequisites
- **Java 21+** (JDK)
- **PostgreSQL 16+** running on `localhost:5432` with database `payroll_insight_db`
  - Default credentials configured in `src/main/resources/application.conf` and `.env`:
    - User: `postgres`
    - Password: `1234`

### 2. Run the API Server
```powershell
.\gradlew.bat run
```
The API server starts on **`http://localhost:8080`**.

### 3. Automated Seeding & Real Enterprise Data
On initial launch or by executing `POST /api/seed?reset=true`, the server automatically initializes real system data:
- **Real Administrative & Audit Users:**
  - `admin@institution.gov` (`Aziz Sulaiman` - Director General of Finance / Super Admin)
  - `s.jenkins@institution.gov` (`Sarah Jenkins` - Senior Payroll Accountant)
  - `d.miller@institution.gov` (`David Miller` - Chief Compliance Auditor)
  - `f.alzahraa@institution.gov` (`Fatima Al-Zahraa` - Disbursement Specialist)
  - Default initial password for all accounts: **`admin123`** (BCrypt hashed in database)
- **Active Payroll Period (`PR-2608` - August 2026):**
  - Seeded with 8 realistic enterprise & government employees across Engineering, IT, Finance, Operations, Legal, HR, and International Consultants (USD & IQD).
  - Pre-computed financial totals, deductions, and salary disbursement states.
- **Draft & Historical Periods:** `PR-2609` (September 2026, Draft), `PR-2607` (July 2026, Archived).
- **Compliance Audit Trail:** Pre-populated with authentic institutional activity logs.

---

## 📡 API Endpoints

### 🩺 System & Health (Public)
- `GET /` — Root directory catalog of all API routes
- `GET /health` — Service health check & database connectivity
- `POST /api/seed` — Check seeds or pass `?reset=true` to force a clean reseed of real records

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/login` — Public: BCrypt verified login. Generates a **24-hour JWT access token** and a **7-day refresh token**.
- `POST /api/auth/refresh` — Public: Exchange an unexpired refresh token for a newly generated 24h access token and rotated refresh token.
- `GET /api/auth/me` — **[Protected]**: Retrieve current authenticated user profile directly from PostgreSQL.
- `POST /api/auth/logout` — **[Protected]**: Revoke refresh token(s) and terminate active session.

### 👤 User Management (`/api/users`) **[Protected - Bearer Token Required]**
- `GET /api/users` — List all institutional users & staff accounts
- `GET /api/users/{id}` — Get single user profile
- `POST /api/users` — Create new staff account (Super Admin, Accountant, Auditor, Disburser) with BCrypt password hashing & audit log
- `PATCH /api/users/{id}` — Update user profile, change role/status, or reset password (invalidates existing sessions)
- `DELETE /api/users/{id}` — Terminate user account, revoke active tokens, and log security audit

### 📅 Payroll Periods (`/api/periods`) **[Protected - Bearer Token Required]**
- `GET /api/periods` — List all payroll periods
- `GET /api/periods/{id}` — Get period details
- `POST /api/periods` — Create period
- `PATCH /api/periods/{id}` — Update period status/details
- `DELETE /api/periods/{id}` — Delete period and cascade employee records
- `POST /api/periods/{id}/recalculate` — Recalculate financial totals from employee roster

### 👥 Employees & Salaries (`/api/employees`) **[Protected - Bearer Token Required]**
- `GET /api/employees?periodId={id}&department={dept}&salaryState={state}&search={q}` — Query employees
- `GET /api/employees/{id}` — Get employee record
- `POST /api/employees` — Enroll employee with automated net salary calculation
- `PATCH /api/employees/{id}` — Update financial details or profile
- `POST /api/employees/{id}/toggle-payment` — Toggle payment state between `Paid`, `Not Yet`, and `Stopped`
- `DELETE /api/employees/{id}` — Terminate employee record
- `POST /api/employees/batch-import` — Batch JSON roster import

### 📊 Excel Roster Import (`/api/employees/upload-excel`)
- `POST /api/employees/upload-excel?periodId={periodId}` — Multipart file upload (`.xlsx` or `.xls`). Automatically maps columns, detects foreign staff, computes deductions, enrolls records, and updates period totals.
- `GET /api/imports` — View history of previous Excel imports
- `DELETE /api/imports` — Clear import history

### 📈 Reports & Analytics (`/api/reports`)
- `GET /api/reports/summary?periodId={id}` — Period summary (total net, paid amount, pending amount, completion rate %)
- `GET /api/reports/departments?periodId={id}` — Department headcount and aggregate salary expense
- `GET /api/reports/currency?periodId={id}` — Local currency (IQD) vs foreign currency (USD) with conversion

### 📜 Compliance & Audit (`/api/audit-logs`)
- `GET /api/audit-logs?category={category}&limit={n}` — Retrieve system and salary audit trail
- `POST /api/audit-logs` — Record compliance audit entry

### ⚙️ System Settings & Dynamic Columns (`/api/settings`)
- `GET /api/settings` — Get institutional settings & currency exchange rate
- `PATCH /api/settings` — Update institutional configuration
- `GET /api/settings/columns` — Get dynamic column configuration with UI visibility, types, and Excel header aliases
- `PUT /api/settings/columns` — Save updated column visibility, labels, and custom Excel aliases (English & Arabic)

---

## 🧪 Testing with Postman

A complete, pre-configured collection is included:
👉 **[`Payroll_Insight_Pro_API.postman_collection.json`](Payroll_Insight_Pro_API.postman_collection.json)**

### How to test:
1. Open **Postman**.
2. Click **Import** (top left).
3. Drag and drop `Payroll_Insight_Pro_API.postman_collection.json`.
4. Run requests in order:
   - Login -> List Periods -> Enroll Employees -> Upload Excel -> Disburse Salaries -> Financial Reports -> Audit Logs!
