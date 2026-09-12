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

## 📡 API Endpoints

### 🩺 System & Health (Public)

### 🔐 Authentication (`/api/auth`)

### 👤 User Management (`/api/users`) **[Protected - Bearer Token Required]**

### 📅 Payroll Periods (`/api/periods`) **[Protected - Bearer Token Required]**

### 👥 Employees & Salaries (`/api/employees`) **[Protected - Bearer Token Required]**

### 📊 Excel Roster Import (`/api/employees/upload-excel`)

### 📈 Reports & Analytics (`/api/reports`)

### 📜 Compliance & Audit (`/api/audit-logs`)

### ⚙️ System Settings & Dynamic Columns (`/api/settings`)

---
