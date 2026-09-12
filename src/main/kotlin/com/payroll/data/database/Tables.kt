package com.payroll.data.database

import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object UsersTable : Table("users") {
    val id = varchar("id", 64)
    val email = varchar("email", 255).uniqueIndex()
    val passwordHash = text("password_hash")
    val name = varchar("name", 255)
    val initials = varchar("initials", 16)
    val role = varchar("role", 64).default("Super Admin")
    val status = varchar("status", 32).default("Active")
    val avatar = text("avatar").nullable()
    val activeSessionId = varchar("active_session_id", 64).nullable()
    val createdAt = datetime("created_at").clientDefault { LocalDateTime.now() }
    val updatedAt = datetime("updated_at").clientDefault { LocalDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}

object PayrollPeriodsTable : Table("payroll_periods") {
    val id = varchar("id", 64)
    val name = varchar("name", 255)
    val ref = varchar("ref", 255)
    val status = varchar("status", 32).default("Draft").index()
    val employeesCount = integer("employees_count").default(0)
    val totalPayroll = double("total_payroll").default(0.0)
    val paidAmount = double("paid_amount").default(0.0)
    val remainingAmount = double("remaining_amount").default(0.0)
    val processedCount = integer("processed_count").default(0)
    val creator = varchar("creator", 255).default("System")
    val createdOn = varchar("created_on", 64)
    val month = varchar("month", 16)
    val year = integer("year")
    val createdAt = datetime("created_at").clientDefault { LocalDateTime.now() }
    val updatedAt = datetime("updated_at").clientDefault { LocalDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}

object EmployeesTable : Table("employees") {
    val id = varchar("id", 64)
    val periodId = reference("period_id", PayrollPeriodsTable.id, onDelete = ReferenceOption.CASCADE).index()
    val name = varchar("name", 255)
    val initials = varchar("initials", 16)
    val avatar = text("avatar").nullable()
    val type = varchar("type", 64).default("Full-Time")
    val department = varchar("department", 128)
    val baseSalary = double("base_salary").default(0.0)
    val bonus = double("bonus").default(0.0)
    val insurance = double("insurance").default(0.0)
    val absenceDays = integer("absence_days").default(0)
    val absenceDeduction = double("absence_deduction").default(0.0)
    val searchingDocFee = double("searching_doc_fee").nullable()
    val searchingDocFeeIqd = double("searching_doc_fee_iqd").nullable()
    val isForeign = bool("is_foreign").default(false)
    val currency = varchar("currency", 32).default("Dinar")
    val hasRecruitmentFee = bool("has_recruitment_fee").default(false)
    val recruitmentFee = double("recruitment_fee").nullable()
    val deductions = double("deductions").default(0.0)
    val netSalary = double("net_salary").default(0.0)
    val salaryState = varchar("salary_state", 32).default("Not Yet").index()
    val paidAt = text("paid_at").nullable()
    val status = varchar("status", 32).default("Active").index()
    val email = varchar("email", 255).default("")
    val phone = varchar("phone", 64).default("")
    val joinDate = varchar("join_date", 64)
    val paymentStatus = varchar("payment_status", 32).default("Unpaid")
    val createdAt = datetime("created_at").clientDefault { LocalDateTime.now() }
    val updatedAt = datetime("updated_at").clientDefault { LocalDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}

object AuditLogsTable : Table("audit_logs") {
    val id = varchar("id", 64)
    val time = varchar("time", 64)
    val action = varchar("action", 255)
    val user = varchar("user_name", 255)
    val detail = text("detail")
    val icon = varchar("icon", 64).default("history")
    val badgeColor = varchar("badge_color", 128).default("bg-blue-50 text-blue-700 border border-blue-200")
    val employeeId = varchar("employee_id", 64).nullable()
    val employeeName = varchar("employee_name", 255).nullable()
    val category = varchar("category", 64).nullable().index()
    val changes = text("changes").nullable()
    val createdAt = datetime("created_at").clientDefault { LocalDateTime.now() }.index()

    override val primaryKey = PrimaryKey(id)
}

object ExcelImportsTable : Table("excel_imports") {
    val id = varchar("id", 64)
    val fileName = varchar("file_name", 255)
    val type = varchar("type", 64).default("Employee Rosters")
    val status = varchar("status", 32).default("Success")
    val recordsCount = integer("records_count").default(0)
    val errorCount = integer("error_count").default(0)
    val importedBy = varchar("imported_by", 255).default("System")
    val date = varchar("date", 64)
    val createdAt = datetime("created_at").clientDefault { LocalDateTime.now() }.index()

    override val primaryKey = PrimaryKey(id)
}

object SystemSettingsTable : Table("system_settings") {
    val id = varchar("id", 64).default("default")
    val institutionName = varchar("institution_name", 255)
    val institutionCode = varchar("institution_code", 128)
    val institutionType = varchar("institution_type", 128)
    val fiscalYear = varchar("fiscal_year", 64)
    val defaultCurrency = varchar("default_currency", 64)
    val usdToDinarRate = double("usd_to_dinar_rate").default(1310.0)
    val sealWatermarkEnabled = bool("seal_watermark_enabled").default(true)
    val sealQrEnabled = bool("seal_qr_enabled").default(true)
    val sealImageUrl = text("seal_image_url").default("")
    val autoSync = bool("auto_sync").default(true)
    val strictAudit = bool("strict_audit").default(true)
    val emailAlerts = bool("email_alerts").default(true)
    val alertRecipients = text("alert_recipients").default("")
    val autoReportSchedule = varchar("auto_report_schedule", 32).default("Monthly")
    val multiCurrency = bool("multi_currency").default(true)
    val twoFactorAuth = bool("two_factor_auth").default(true)
    val twoFactorEnforcement = varchar("two_factor_enforcement", 64).default("Admins & Disbursers")
    val sessionTimeoutMinutes = integer("session_timeout_minutes").default(15)
    val dualSignatureDisbursement = bool("dual_signature_disbursement").default(true)
    val anomalyDetectionAlerts = bool("anomaly_detection_alerts").default(true)
    val dynamicFieldsJson = text("dynamic_fields_json").nullable()
    val adminUsersJson = text("admin_users_json").nullable()
    val updatedAt = datetime("updated_at").clientDefault { LocalDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}

object RefreshTokensTable : Table("refresh_tokens") {
    val id = varchar("id", 64)
    val userId = reference("user_id", UsersTable.id, onDelete = ReferenceOption.CASCADE).index()
    val token = text("token").uniqueIndex()
    val expiresAt = datetime("expires_at")
    val isRevoked = bool("is_revoked").default(false)
    val createdAt = datetime("created_at").clientDefault { LocalDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}
