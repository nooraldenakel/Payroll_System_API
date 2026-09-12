package com.payroll.data.repository

import com.payroll.data.database.DatabaseFactory.dbQuery
import com.payroll.data.database.SystemSettingsTable
import com.payroll.domain.models.ColumnConfigDto
import com.payroll.domain.models.SystemSettingsDto
import com.payroll.domain.models.UpdateSettingsRequest
import com.payroll.domain.repository.ISettingsRepository
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.*
import java.time.LocalDateTime

class SettingsRepositoryImpl : ISettingsRepository {
    private fun toDto(row: ResultRow): SystemSettingsDto = SystemSettingsDto(
        id = row[SystemSettingsTable.id],
        institutionName = row[SystemSettingsTable.institutionName],
        institutionCode = row[SystemSettingsTable.institutionCode],
        institutionType = row[SystemSettingsTable.institutionType],
        fiscalYear = row[SystemSettingsTable.fiscalYear],
        defaultCurrency = row[SystemSettingsTable.defaultCurrency],
        usdToDinarRate = row[SystemSettingsTable.usdToDinarRate],
        sealWatermarkEnabled = row[SystemSettingsTable.sealWatermarkEnabled],
        sealQrEnabled = row[SystemSettingsTable.sealQrEnabled],
        sealImageUrl = row[SystemSettingsTable.sealImageUrl],
        autoSync = row[SystemSettingsTable.autoSync],
        strictAudit = row[SystemSettingsTable.strictAudit],
        emailAlerts = row[SystemSettingsTable.emailAlerts],
        alertRecipients = row[SystemSettingsTable.alertRecipients],
        autoReportSchedule = row[SystemSettingsTable.autoReportSchedule],
        multiCurrency = row[SystemSettingsTable.multiCurrency],
        twoFactorAuth = row[SystemSettingsTable.twoFactorAuth],
        twoFactorEnforcement = row[SystemSettingsTable.twoFactorEnforcement],
        sessionTimeoutMinutes = row[SystemSettingsTable.sessionTimeoutMinutes],
        dualSignatureDisbursement = row[SystemSettingsTable.dualSignatureDisbursement],
        anomalyDetectionAlerts = row[SystemSettingsTable.anomalyDetectionAlerts],
        dynamicFieldsJson = row[SystemSettingsTable.dynamicFieldsJson],
        adminUsersJson = row[SystemSettingsTable.adminUsersJson]
    )

    override suspend fun get(): SystemSettingsDto = dbQuery {
        SystemSettingsTable.selectAll().where { SystemSettingsTable.id eq "default" }
            .map(::toDto)
            .singleOrNull()
            ?: SystemSettingsDto(
                institutionName = "Payroll System",
                institutionCode = "SYS-PAYROLL-01",
                institutionType = "Enterprise",
                fiscalYear = "2026",
                defaultCurrency = "USD",
                usdToDinarRate = 1.0,
                sealWatermarkEnabled = false,
                sealQrEnabled = false,
                sealImageUrl = "",
                autoSync = false,
                strictAudit = true,
                emailAlerts = false,
                alertRecipients = "",
                autoReportSchedule = "Monthly",
                multiCurrency = false,
                twoFactorAuth = false,
                twoFactorEnforcement = "Admins",
                sessionTimeoutMinutes = 30,
                dualSignatureDisbursement = false,
                anomalyDetectionAlerts = false
            )
    }

    override suspend fun update(updates: UpdateSettingsRequest): SystemSettingsDto = dbQuery {
        SystemSettingsTable.update({ SystemSettingsTable.id eq "default" }) {
            updates.institutionName?.let { v -> it[institutionName] = v }
            updates.institutionCode?.let { v -> it[institutionCode] = v }
            updates.institutionType?.let { v -> it[institutionType] = v }
            updates.fiscalYear?.let { v -> it[fiscalYear] = v }
            updates.defaultCurrency?.let { v -> it[defaultCurrency] = v }
            updates.usdToDinarRate?.let { v -> it[usdToDinarRate] = v }
            updates.sealWatermarkEnabled?.let { v -> it[sealWatermarkEnabled] = v }
            updates.sealQrEnabled?.let { v -> it[sealQrEnabled] = v }
            updates.sealImageUrl?.let { v -> it[sealImageUrl] = v }
            updates.autoSync?.let { v -> it[autoSync] = v }
            updates.strictAudit?.let { v -> it[strictAudit] = v }
            updates.emailAlerts?.let { v -> it[emailAlerts] = v }
            updates.alertRecipients?.let { v -> it[alertRecipients] = v }
            updates.autoReportSchedule?.let { v -> it[autoReportSchedule] = v }
            updates.multiCurrency?.let { v -> it[multiCurrency] = v }
            updates.twoFactorAuth?.let { v -> it[twoFactorAuth] = v }
            updates.twoFactorEnforcement?.let { v -> it[twoFactorEnforcement] = v }
            updates.sessionTimeoutMinutes?.let { v -> it[sessionTimeoutMinutes] = v }
            updates.dualSignatureDisbursement?.let { v -> it[dualSignatureDisbursement] = v }
            updates.anomalyDetectionAlerts?.let { v -> it[anomalyDetectionAlerts] = v }
            updates.dynamicFieldsJson?.let { v -> it[dynamicFieldsJson] = v }
            updates.adminUsersJson?.let { v -> it[adminUsersJson] = v }
            it[updatedAt] = LocalDateTime.now()
        }
        get()
    }

    private val jsonHelper = Json { ignoreUnknownKeys = true }

    private val defaultColumns = listOf(
        ColumnConfigDto("name", "Employee Name", "Text", visible = true, required = true, excelAliases = listOf("name", "employee name", "full name", "employee", "staff name", "الاسم", "اسم الموظف")),
        ColumnConfigDto("department", "Department", "Text", visible = true, required = true, excelAliases = listOf("department", "dept", "division", "unit", "القسم", "الدائرة")),
        ColumnConfigDto("type", "Employment Type", "Text", visible = true, required = false, excelAliases = listOf("type", "employment type", "contract type", "contract", "نوع التعيين", "الصفة")),
        ColumnConfigDto("baseSalary", "Base Salary", "Currency", visible = true, required = true, excelAliases = listOf("base salary", "basic salary", "salary", "base pay", "net base", "الراتب الاسمي", "الاسمي")),
        ColumnConfigDto("bonus", "Bonus / Allowances", "Currency", visible = true, required = false, excelAliases = listOf("bonus", "allowance", "incentive", "المخصصات", "مخصصات")),
        ColumnConfigDto("insurance", "Insurance & Pension", "Currency", visible = true, required = false, excelAliases = listOf("insurance", "health insurance", "social security", "التقاعد", "الضمان")),
        ColumnConfigDto("absenceDays", "Absence Days", "Number", visible = true, required = false, excelAliases = listOf("absence days", "absences", "absence count", "ايام الغياب", "الغياب")),
        ColumnConfigDto("absenceDeduction", "Absence Deduction", "Currency", visible = true, required = false, excelAliases = listOf("absence deduction", "absence fee", "absence penalty", "استقطاع الغياب")),
        ColumnConfigDto("searchingDocFee", "Search Fee (USD)", "Currency", visible = true, required = false, excelAliases = listOf("search fee", "searching fee", "searching doc fee", "doc fee", "search", "رسم البحث")),
        ColumnConfigDto("recruitmentFee", "Recruitment Fee", "Currency", visible = true, required = false, excelAliases = listOf("recruitment fee", "recruitment", "hiring fee", "رسم التوظيف")),
        ColumnConfigDto("isForeign", "Foreign Expert", "Boolean", visible = true, required = false, excelAliases = listOf("foreign", "is foreign", "nationality", "citizenship", "alien", "اجنبي")),
        ColumnConfigDto("currency", "Currency", "Text", visible = true, required = false, excelAliases = listOf("currency", "curr", "العملة")),
        ColumnConfigDto("deductions", "Total Deductions", "Currency", visible = true, required = false, excelAliases = listOf("deductions", "total deductions", "مجموع الاستقطاعات")),
        ColumnConfigDto("netSalary", "Net Salary", "Currency", visible = true, required = false, excelAliases = listOf("net salary", "net pay", "صافي الراتب")),
        ColumnConfigDto("salaryState", "Payment State", "Text", visible = true, required = false, excelAliases = listOf("salary state", "status", "حالة الصرف")),
        ColumnConfigDto("email", "Email Address", "Text", visible = false, required = false, excelAliases = listOf("email", "e-mail", "mail", "البريد الالكتروني")),
        ColumnConfigDto("phone", "Phone Number", "Text", visible = false, required = false, excelAliases = listOf("phone", "mobile", "telephone", "contact", "رقم الهاتف"))
    )

    override suspend fun getColumns(): List<ColumnConfigDto> = dbQuery {
        val rawJson = SystemSettingsTable.selectAll().where { SystemSettingsTable.id eq "default" }
            .map { it[SystemSettingsTable.dynamicFieldsJson] }
            .singleOrNull()

        if (!rawJson.isNullOrBlank()) {
            try {
                jsonHelper.decodeFromString<List<ColumnConfigDto>>(rawJson)
            } catch (e: Exception) {
                defaultColumns
            }
        } else {
            defaultColumns
        }
    }

    override suspend fun updateColumns(columns: List<ColumnConfigDto>): List<ColumnConfigDto> = dbQuery {
        val jsonStr = jsonHelper.encodeToString(columns)
        SystemSettingsTable.update({ SystemSettingsTable.id eq "default" }) {
            it[dynamicFieldsJson] = jsonStr
            it[updatedAt] = LocalDateTime.now()
        }
        columns
    }
}
