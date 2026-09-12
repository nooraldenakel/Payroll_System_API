package com.payroll.data.database

import com.typesafe.config.ConfigFactory
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.ktor.server.config.HoconApplicationConfig
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.update
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.transactions.transaction
import org.mindrot.jbcrypt.BCrypt
import org.slf4j.LoggerFactory
import java.time.LocalDateTime

object DatabaseFactory {
    private val logger = LoggerFactory.getLogger(DatabaseFactory::class.java)

    fun init(config: HoconApplicationConfig? = null) {
        val appConfig = config ?: HoconApplicationConfig(ConfigFactory.load())

        val dbUrl = appConfig.propertyOrNull("database.url")?.getString()
            ?: "jdbc:postgresql://localhost:5432/payroll_insight_db"
        val dbUser = appConfig.propertyOrNull("database.user")?.getString() ?: "postgres"
        val dbPassword = appConfig.propertyOrNull("database.password")?.getString() ?: System.getenv("DB_PASSWORD") ?: ""
        val dbDriver = appConfig.propertyOrNull("database.driver")?.getString() ?: "org.postgresql.Driver"
        val maxPoolSize = appConfig.propertyOrNull("database.maximumPoolSize")?.getString()?.toIntOrNull() ?: 10

        logger.info("Connecting to PostgreSQL at $dbUrl with user $dbUser")

        val hikariConfig = HikariConfig().apply {
            driverClassName = dbDriver
            jdbcUrl = dbUrl
            username = dbUser
            password = dbPassword
            maximumPoolSize = maxPoolSize
            isAutoCommit = false
            transactionIsolation = "TRANSACTION_REPEATABLE_READ"
            validate()
        }

        val dataSource = HikariDataSource(hikariConfig)
        Database.connect(dataSource)

        transaction {
            SchemaUtils.createMissingTablesAndColumns(
                UsersTable,
                PayrollPeriodsTable,
                EmployeesTable,
                AuditLogsTable,
                ExcelImportsTable,
                SystemSettingsTable,
                RefreshTokensTable
            )

            seedInitialData(forceReset = false)
        }

        logger.info("Payroll database schema and real system data initialized successfully.")
    }

    fun reseedDatabase(): Boolean = transaction {
        seedInitialData(forceReset = true)
        true
    }

    private fun seedInitialData(forceReset: Boolean = false) {
        if (forceReset) {
            RefreshTokensTable.deleteAll()
            EmployeesTable.deleteAll()
            AuditLogsTable.deleteAll()
            ExcelImportsTable.deleteAll()
            PayrollPeriodsTable.deleteAll()
            UsersTable.deleteAll()
            SystemSettingsTable.deleteAll()
            logger.info("Cleared existing records for clean enterprise reseeding.")
        }

        val salt = BCrypt.gensalt(10)
        val defaultAdminPass = System.getenv("DEFAULT_ADMIN_PASSWORD") ?: "admin123"
        val defaultPassHash = BCrypt.hashpw(defaultAdminPass, salt)

        // 1. Seed Real System Administrative & Audit Users
        if (UsersTable.selectAll().empty()) {
            val users = listOf(
                Triple("u-1", "admin@institution.gov", "Aziz Sulaiman") to Pair("AS", "Super Admin"),
                Triple("u-2", "s.jenkins@institution.gov", "Sarah Jenkins") to Pair("SJ", "Senior Payroll Accountant"),
                Triple("u-3", "d.miller@institution.gov", "David Miller") to Pair("DM", "Chief Compliance Auditor"),
                Triple("u-4", "f.alzahraa@institution.gov", "Fatima Al-Zahraa") to Pair("FA", "Disbursement Specialist")
            )

            for ((creds, meta) in users) {
                val (uId, uEmail, uName) = creds
                val (uInitials, uRole) = meta
                UsersTable.insert {
                    it[id] = uId
                    it[email] = uEmail.lowercase()
                    it[passwordHash] = defaultPassHash
                    it[name] = uName
                    it[initials] = uInitials
                    it[role] = uRole
                    it[status] = "Active"
                    it[avatar] = null
                    it[createdAt] = LocalDateTime.now()
                    it[updatedAt] = LocalDateTime.now()
                }
            }
            logger.info("Seeded 4 baseline institutional staff accounts.")
        }

        // 2. Seed Real Payroll Periods
        if (PayrollPeriodsTable.selectAll().empty()) {
            val periods = listOf(
                Triple("PR-2608", "August 2026", "Active") to Pair("AUG", 2026),
                Triple("PR-2609", "September 2026", "Draft") to Pair("SEP", 2026),
                Triple("PR-2607", "July 2026", "Archived") to Pair("JUL", 2026)
            )

            for ((triple, meta) in periods) {
                val (pId, pName, pStatus) = triple
                val (pMonth, pYear) = meta
                PayrollPeriodsTable.insert {
                    it[id] = pId
                    it[name] = pName
                    it[ref] = "$pId-gov"
                    it[status] = pStatus
                    it[employeesCount] = 0
                    it[totalPayroll] = 0.0
                    it[paidAmount] = 0.0
                    it[remainingAmount] = 0.0
                    it[processedCount] = 0
                    it[creator] = "Aziz Sulaiman"
                    it[createdOn] = "$pMonth 1, $pYear"
                    it[month] = pMonth
                    it[year] = pYear
                    it[createdAt] = LocalDateTime.now()
                    it[updatedAt] = LocalDateTime.now()
                }
            }
            logger.info("Seeded realistic institutional payroll periods.")
        }

        // 3. Seed Real Employee Roster into Active Period (PR-2608)
        if (EmployeesTable.selectAll().empty()) {
            val usdRate = 1310.0
            data class SeedEmp(
                val id: String,
                val name: String,
                val department: String,
                val base: Double,
                val bonus: Double,
                val insurance: Double,
                val absenceDays: Int,
                val absenceDeduction: Double,
                val isForeign: Boolean,
                val currency: String,
                val feeUsd: Double?,
                val recruitFee: Double?,
                val salaryState: String,
                val email: String,
                val phone: String,
                val joinDate: String
            )

            val realEmployees = listOf(
                SeedEmp("EMP-1001", "Tariq Al-Hashimi", "Engineering & Infrastructure", 2500000.0, 250000.0, 75000.0, 0, 0.0, false, "Dinar", null, null, "Paid", "t.alhashimi@institution.gov", "+964 770 123 4567", "2021-03-15"),
                SeedEmp("EMP-1002", "Zahra Karim Al-Bayati", "Financial Auditing", 1900000.0, 150000.0, 60000.0, 0, 0.0, false, "Dinar", null, null, "Paid", "z.albayati@institution.gov", "+964 771 234 5678", "2022-06-01"),
                SeedEmp("EMP-1003", "Haider Mustafa Salman", "Information Technology", 2100000.0, 200000.0, 70000.0, 1, 70000.0, false, "Dinar", null, null, "Paid", "h.salman@institution.gov", "+964 772 345 6789", "2020-01-10"),
                SeedEmp("EMP-1004", "Maryam Nabil Al-Saadi", "Operations & Municipal", 1650000.0, 100000.0, 50000.0, 0, 0.0, false, "Dinar", null, null, "Paid", "m.alsaadi@institution.gov", "+964 773 456 7890", "2023-04-12"),
                SeedEmp("EMP-1005", "Youssef Bilal Al-Rawi", "Legal Affairs", 2200000.0, 180000.0, 70000.0, 0, 0.0, false, "Dinar", null, null, "Not Yet", "y.alrawi@institution.gov", "+964 774 567 8901", "2019-11-20"),
                SeedEmp("EMP-1006", "Nour Hussein Al-Khatib", "Human Resources", 1750000.0, 120000.0, 55000.0, 2, 110000.0, false, "Dinar", null, null, "Not Yet", "n.alkhatib@institution.gov", "+964 775 678 9012", "2022-09-01"),
                SeedEmp("EMP-1007", "Dr. Marcus Vance", "Technical Advisory", 4200.0, 400.0, 150.0, 0, 0.0, true, "USD", 120.0, 250.0, "Not Yet", "m.vance@consultants.gov", "+964 776 789 0123", "2024-02-01"),
                SeedEmp("EMP-1008", "Dr. Elena Rostova", "Technical Advisory", 4500.0, 500.0, 150.0, 0, 0.0, true, "USD", 150.0, 300.0, "Stopped", "e.rostova@consultants.gov", "+964 777 890 1234", "2024-01-15")
            )

            var totalNetSum = 0.0
            var paidNetSum = 0.0
            var paidCount = 0

            for (emp in realEmployees) {
                val safeRecruit = emp.recruitFee ?: 0.0
                val safeSearch = emp.feeUsd ?: 0.0
                val deductions = safeRecruit + emp.insurance + emp.absenceDeduction + safeSearch
                val netSalary = maxOf(0.0, (emp.base - safeRecruit) + emp.bonus - emp.insurance - emp.absenceDeduction - safeSearch)
                val feeIqd = if (emp.isForeign && safeSearch > 0) Math.round(safeSearch * usdRate).toDouble() else null
                val isPaid = emp.salaryState.equals("Paid", ignoreCase = true)
                val initials = emp.name.split(" ").filter { it.isNotBlank() && !it.startsWith("Eng.") && !it.startsWith("Dr.") }
                    .take(2).map { it.first() }.joinToString("").uppercase().ifBlank { "EM" }

                EmployeesTable.insert {
                    it[id] = emp.id
                    it[periodId] = "PR-2608"
                    it[name] = emp.name
                    it[EmployeesTable.initials] = initials
                    it[avatar] = null
                    it[type] = if (emp.isForeign) "Contractor / Expert" else "Full-Time"
                    it[department] = emp.department
                    it[baseSalary] = emp.base
                    it[bonus] = emp.bonus
                    it[insurance] = emp.insurance
                    it[absenceDays] = emp.absenceDays
                    it[absenceDeduction] = emp.absenceDeduction
                    it[searchingDocFee] = emp.feeUsd
                    it[searchingDocFeeIqd] = feeIqd
                    it[isForeign] = emp.isForeign
                    it[currency] = emp.currency
                    it[hasRecruitmentFee] = emp.recruitFee != null
                    it[recruitmentFee] = emp.recruitFee
                    it[EmployeesTable.deductions] = deductions
                    it[EmployeesTable.netSalary] = netSalary
                    it[salaryState] = emp.salaryState
                    it[paidAt] = if (isPaid) LocalDateTime.now().toString() else null
                    it[status] = "Active"
                    it[email] = emp.email
                    it[phone] = emp.phone
                    it[joinDate] = emp.joinDate
                    it[paymentStatus] = if (isPaid) "Paid" else "Unpaid"
                    it[createdAt] = LocalDateTime.now()
                    it[updatedAt] = LocalDateTime.now()
                }

                totalNetSum += netSalary
                if (isPaid) {
                    paidNetSum += netSalary
                    paidCount++
                }
            }

            // Update active period with calculated aggregates
            PayrollPeriodsTable.update({ PayrollPeriodsTable.id eq "PR-2608" }) {
                it[employeesCount] = realEmployees.size
                it[totalPayroll] = totalNetSum
                it[paidAmount] = paidNetSum
                it[remainingAmount] = maxOf(0.0, totalNetSum - paidNetSum)
                it[processedCount] = paidCount
                it[updatedAt] = LocalDateTime.now()
            }

            logger.info("Seeded ${realEmployees.size} real institutional employees and computed aggregates for PR-2608.")
        }

        // 4. Seed Real Compliance Audit Logs
        if (AuditLogsTable.selectAll().empty()) {
            val logs = listOf(
                Triple("Period Activated", "Aziz Sulaiman", "Activated institutional payroll period PR-2608 (August 2026)") to Pair("calendar_today", "bg-emerald-50 text-emerald-700 border border-emerald-200"),
                Triple("Roster Enrolled", "Sarah Jenkins", "Enrolled 8 full-time and international consultant records into PR-2608") to Pair("group_add", "bg-blue-50 text-blue-700 border border-blue-200"),
                Triple("Salaries Disbursed", "Fatima Al-Zahraa", "Disbursed 4 approved payroll transfers for engineering and municipal staff") to Pair("payments", "bg-emerald-50 text-emerald-700 border border-emerald-200"),
                Triple("Compliance Verification", "David Miller", "Verified statutory recruitment fees and foreign search fees against Iraqi labor regulations") to Pair("verified_user", "bg-purple-50 text-purple-700 border border-purple-200")
            )

            for ((main, style) in logs) {
                val (action, user, detail) = main
                val (icon, color) = style
                val logId = "AUD-${(1000..9999).random()}"
                AuditLogsTable.insert {
                    it[id] = logId
                    it[time] = "09:00 today"
                    it[AuditLogsTable.action] = action
                    it[AuditLogsTable.user] = user
                    it[AuditLogsTable.detail] = detail
                    it[AuditLogsTable.icon] = icon
                    it[badgeColor] = color
                    it[category] = "System"
                    it[createdAt] = LocalDateTime.now()
                }
            }
            logger.info("Seeded real compliance audit trail entries.")
        }

        // 5. Seed Real System Settings
        if (SystemSettingsTable.selectAll().empty()) {
            SystemSettingsTable.insert {
                it[id] = "default"
                it[institutionName] = "General Directorate of Municipalities & Public Works"
                it[institutionCode] = "GOV-IQ-FIN-2026-HQ"
                it[institutionType] = "Government Ministry (Public Sector)"
                it[fiscalYear] = "FY 2026 – 2027"
                it[defaultCurrency] = "Dinar (IQD)"
                it[usdToDinarRate] = 1310.0
                it[sealWatermarkEnabled] = true
                it[sealQrEnabled] = true
                it[sealImageUrl] = ""
                it[autoSync] = true
                it[strictAudit] = true
                it[emailAlerts] = true
                it[alertRecipients] = "audit-board@gov.iq, finance.director@gov.iq"
                it[autoReportSchedule] = "Monthly"
                it[multiCurrency] = true
                it[twoFactorAuth] = true
                it[twoFactorEnforcement] = "Admins & Disbursers"
                it[sessionTimeoutMinutes] = 15
                it[dualSignatureDisbursement] = true
                it[anomalyDetectionAlerts] = true
                it[dynamicFieldsJson] = """[
                    {"key":"name","label":"Employee Name","type":"Text","visible":true,"required":true,"excelAliases":["name","employee name","full name","employee","staff name","الاسم","اسم الموظف"]},
                    {"key":"department","label":"Department","type":"Text","visible":true,"required":true,"excelAliases":["department","dept","division","unit","القسم","الدائرة"]},
                    {"key":"type","label":"Employment Type","type":"Text","visible":true,"required":false,"excelAliases":["type","employment type","contract type","contract","نوع التعيين","الصفة"]},
                    {"key":"baseSalary","label":"Base Salary","type":"Currency","visible":true,"required":true,"excelAliases":["base salary","basic salary","salary","base pay","net base","الراتب الاسمي","الاسمي"]},
                    {"key":"bonus","label":"Bonus / Allowances","type":"Currency","visible":true,"required":false,"excelAliases":["bonus","allowance","incentive","المخصصات","مخصصات"]},
                    {"key":"insurance","label":"Insurance & Pension","type":"Currency","visible":true,"required":false,"excelAliases":["insurance","health insurance","social security","التقاعد","الضمان"]},
                    {"key":"absenceDays","label":"Absence Days","type":"Number","visible":true,"required":false,"excelAliases":["absence days","absences","absence count","ايام الغياب","الغياب"]},
                    {"key":"absenceDeduction","label":"Absence Deduction","type":"Currency","visible":true,"required":false,"excelAliases":["absence deduction","absence fee","absence penalty","استقطاع الغياب"]},
                    {"key":"searchingDocFee","label":"Search Fee (USD)","type":"Currency","visible":true,"required":false,"excelAliases":["search fee","searching fee","searching doc fee","doc fee","search","رسم البحث"]},
                    {"key":"recruitmentFee","label":"Recruitment Fee","type":"Currency","visible":true,"required":false,"excelAliases":["recruitment fee","recruitment","hiring fee","رسم التوظيف"]},
                    {"key":"isForeign","label":"Foreign Expert","type":"Boolean","visible":true,"required":false,"excelAliases":["foreign","is foreign","nationality","citizenship","alien","اجنبي"]},
                    {"key":"currency","label":"Currency","type":"Text","visible":true,"required":false,"excelAliases":["currency","curr","العملة"]},
                    {"key":"deductions","label":"Total Deductions","type":"Currency","visible":true,"required":false,"excelAliases":["deductions","total deductions","مجموع الاستقطاعات"]},
                    {"key":"netSalary","label":"Net Salary","type":"Currency","visible":true,"required":false,"excelAliases":["net salary","net pay","صافي الراتب"]},
                    {"key":"salaryState","label":"Payment State","type":"Text","visible":true,"required":false,"excelAliases":["salary state","status","حالة الصرف"]},
                    {"key":"email","label":"Email Address","type":"Text","visible":false,"required":false,"excelAliases":["email","e-mail","mail","البريد الالكتروني"]},
                    {"key":"phone","label":"Phone Number","type":"Text","visible":false,"required":false,"excelAliases":["phone","mobile","telephone","contact","رقم الهاتف"]}
                ]"""
                it[adminUsersJson] = """[
                    {"id":"u-1","name":"Aziz Sulaiman","initials":"AS","email":"admin@institution.gov","role":"Super Admin","status":"Active"},
                    {"id":"u-2","name":"Sarah Jenkins","initials":"SJ","email":"s.jenkins@institution.gov","role":"Senior Payroll Accountant","status":"Active"},
                    {"id":"u-3","name":"David Miller","initials":"DM","email":"d.miller@institution.gov","role":"Chief Compliance Auditor","status":"Active"},
                    {"id":"u-4","name":"Fatima Al-Zahraa","initials":"FA","email":"f.alzahraa@institution.gov","role":"Disbursement Specialist","status":"Active"}
                ]"""
                it[updatedAt] = LocalDateTime.now()
            }
            logger.info("Seeded real government system settings.")
        }
    }

    suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO) { block() }
}
