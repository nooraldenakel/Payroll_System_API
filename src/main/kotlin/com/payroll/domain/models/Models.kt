package com.payroll.domain.models

import kotlinx.serialization.Serializable

@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val message: String? = null,
    val data: T? = null
)

@Serializable
data class SimpleResponse(
    val success: Boolean,
    val message: String? = null
)

// ==========================================
// Authentication & User Models
// ==========================================

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val name: String,
    val initials: String,
    val role: String,
    val status: String,
    val avatar: String? = null,
    val activeSessionId: String? = null
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class CreateUserRequest(
    val email: String,
    val password: String,
    val name: String,
    val initials: String? = null,
    val role: String = "Editor",
    val status: String = "Active",
    val avatar: String? = null
)

@Serializable
data class UpdateUserRequest(
    val name: String? = null,
    val initials: String? = null,
    val email: String? = null,
    val password: String? = null,
    val role: String? = null,
    val status: String? = null,
    val avatar: String? = null
)

@Serializable
data class LoginResponse(
    val user: UserDto,
    val accessToken: String,
    val refreshToken: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long = 86400, // 24 hours in seconds
    val token: String? = null // Backward compatibility
)

@Serializable
data class RefreshTokenRequest(
    val refreshToken: String
)

@Serializable
data class RefreshTokenResponse(
    val accessToken: String,
    val refreshToken: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long = 86400,
    val token: String? = null
)

@Serializable
data class RefreshTokenDto(
    val id: String,
    val userId: String,
    val token: String,
    val expiresAt: String,
    val isRevoked: Boolean,
    val createdAt: String
)

// ==========================================
// Payroll Period Models
// ==========================================

@Serializable
data class PayrollPeriodDto(
    val id: String,
    val name: String,
    val ref: String,
    val status: String,
    val employeesCount: Int,
    val totalPayroll: Double,
    val paidAmount: Double,
    val remainingAmount: Double,
    val processedCount: Int,
    val creator: String,
    val createdOn: String,
    val month: String,
    val year: Int,
    val createdAt: String
)

@Serializable
data class CreatePeriodRequest(
    val id: String? = null,
    val name: String,
    val ref: String? = null,
    val status: String = "Draft",
    val month: String = "AUG",
    val year: Int = 2026,
    val creator: String = "Aziz Sulaiman"
)

@Serializable
data class UpdatePeriodRequest(
    val name: String? = null,
    val status: String? = null,
    val totalPayroll: Double? = null,
    val paidAmount: Double? = null,
    val remainingAmount: Double? = null,
    val processedCount: Int? = null,
    val employeesCount: Int? = null
)

// ==========================================
// Employee & Salary Models
// ==========================================

@Serializable
data class EmployeeDto(
    val id: String,
    val periodId: String,
    val name: String,
    val initials: String,
    val avatar: String? = null,
    val type: String = "Full-Time",
    val department: String,
    val baseSalary: Double,
    val bonus: Double = 0.0,
    val insurance: Double = 0.0,
    val absenceDays: Int = 0,
    val absenceDeduction: Double = 0.0,
    val searchingDocFee: Double? = null,
    val searchingDocFeeIqd: Double? = null,
    val isForeign: Boolean = false,
    val currency: String = "Dinar",
    val hasRecruitmentFee: Boolean = false,
    val recruitmentFee: Double? = null,
    val deductions: Double = 0.0,
    val netSalary: Double = 0.0,
    val salaryState: String = "Not Yet",
    val paidAt: String? = null,
    val status: String = "Active",
    val email: String = "",
    val phone: String = "",
    val joinDate: String = "",
    val paymentStatus: String = "Unpaid",
    val createdAt: String
)

@Serializable
data class CreateEmployeeRequest(
    val id: String? = null,
    val periodId: String,
    val name: String,
    val initials: String? = null,
    val avatar: String? = null,
    val type: String = "Full-Time",
    val department: String = "Operations",
    val baseSalary: Double = 0.0,
    val bonus: Double = 0.0,
    val insurance: Double = 0.0,
    val absenceDays: Int = 0,
    val absenceDeduction: Double = 0.0,
    val searchingDocFee: Double? = null,
    val searchingDocFeeIqd: Double? = null,
    val isForeign: Boolean = false,
    val currency: String? = null,
    val hasRecruitmentFee: Boolean = false,
    val recruitmentFee: Double? = null,
    val deductions: Double? = null,
    val netSalary: Double? = null,
    val salaryState: String = "Not Yet",
    val paidAt: String? = null,
    val status: String = "Active",
    val email: String? = null,
    val phone: String? = null,
    val joinDate: String? = null,
    val paymentStatus: String = "Unpaid"
)

@Serializable
data class UpdateEmployeeRequest(
    val periodId: String? = null,
    val name: String? = null,
    val initials: String? = null,
    val avatar: String? = null,
    val type: String? = null,
    val department: String? = null,
    val baseSalary: Double? = null,
    val bonus: Double? = null,
    val insurance: Double? = null,
    val absenceDays: Int? = null,
    val absenceDeduction: Double? = null,
    val searchingDocFee: Double? = null,
    val searchingDocFeeIqd: Double? = null,
    val isForeign: Boolean? = null,
    val currency: String? = null,
    val hasRecruitmentFee: Boolean? = null,
    val recruitmentFee: Double? = null,
    val deductions: Double? = null,
    val netSalary: Double? = null,
    val salaryState: String? = null,
    val paidAt: String? = null,
    val status: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val joinDate: String? = null,
    val paymentStatus: String? = null
)

@Serializable
data class TogglePaymentRequest(
    val nextState: String? = null // "Paid" | "Not Yet" | "Stopped"
)

@Serializable
data class BatchImportEmployeeRequest(
    val periodId: String,
    val fileName: String? = "roster_batch.xlsx",
    val employees: List<CreateEmployeeRequest>
)

@Serializable
data class BatchImportResponse(
    val importedCount: Int,
    val periodId: String,
    val totalPayrollUpdated: Double,
    val message: String
)

// ==========================================
// Audit Log Models
// ==========================================

@Serializable
data class AuditChange(
    val field: String,
    val from: String,
    val to: String
)

@Serializable
data class AuditLogEntryDto(
    val id: String,
    val time: String,
    val action: String,
    val user: String,
    val detail: String,
    val icon: String,
    val badgeColor: String,
    val employeeId: String? = null,
    val employeeName: String? = null,
    val category: String? = null,
    val changes: String? = null,
    val createdAt: String
)

@Serializable
data class CreateAuditLogRequest(
    val action: String,
    val user: String = "System",
    val detail: String,
    val icon: String = "history",
    val badgeColor: String = "bg-blue-50 text-blue-700 border border-blue-200",
    val employeeId: String? = null,
    val employeeName: String? = null,
    val category: String = "System",
    val changes: String? = null
)

// ==========================================
// Excel Import Record Models
// ==========================================

@Serializable
data class ExcelImportRecordDto(
    val id: String,
    val fileName: String,
    val type: String,
    val status: String,
    val recordsCount: Int,
    val errorCount: Int,
    val importedBy: String,
    val date: String,
    val createdAt: String
)

@Serializable
data class CreateImportRecordRequest(
    val fileName: String,
    val type: String = "Employee Rosters",
    val status: String = "Success",
    val recordsCount: Int = 0,
    val errorCount: Int = 0,
    val importedBy: String = "System",
    val date: String? = null
)

// ==========================================
// System Settings Models
// ==========================================

@Serializable
data class DynamicFieldDef(
    val id: String,
    val name: String,
    val type: String
)

@Serializable
data class ColumnConfigDto(
    val key: String,
    val label: String,
    val type: String = "Text", // "Text" | "Currency" | "Number" | "Boolean" | "Date"
    val visible: Boolean = true,
    val required: Boolean = false,
    val excelAliases: List<String> = emptyList()
)

@Serializable
data class UpdateColumnsRequest(
    val columns: List<ColumnConfigDto>
)

@Serializable
data class AdminUserDef(
    val id: String,
    val name: String,
    val initials: String,
    val email: String,
    val role: String,
    val status: String
)

@Serializable
data class SystemSettingsDto(
    val id: String = "default",
    val institutionName: String,
    val institutionCode: String,
    val institutionType: String,
    val fiscalYear: String,
    val defaultCurrency: String,
    val usdToDinarRate: Double,
    val sealWatermarkEnabled: Boolean,
    val sealQrEnabled: Boolean,
    val sealImageUrl: String,
    val autoSync: Boolean,
    val strictAudit: Boolean,
    val emailAlerts: Boolean,
    val alertRecipients: String,
    val autoReportSchedule: String,
    val multiCurrency: Boolean,
    val twoFactorAuth: Boolean,
    val twoFactorEnforcement: String,
    val sessionTimeoutMinutes: Int,
    val dualSignatureDisbursement: Boolean,
    val anomalyDetectionAlerts: Boolean,
    val dynamicFieldsJson: String? = null,
    val adminUsersJson: String? = null
)

@Serializable
data class UpdateSettingsRequest(
    val institutionName: String? = null,
    val institutionCode: String? = null,
    val institutionType: String? = null,
    val fiscalYear: String? = null,
    val defaultCurrency: String? = null,
    val usdToDinarRate: Double? = null,
    val sealWatermarkEnabled: Boolean? = null,
    val sealQrEnabled: Boolean? = null,
    val sealImageUrl: String? = null,
    val autoSync: Boolean? = null,
    val strictAudit: Boolean? = null,
    val emailAlerts: Boolean? = null,
    val alertRecipients: String? = null,
    val autoReportSchedule: String? = null,
    val multiCurrency: Boolean? = null,
    val twoFactorAuth: Boolean? = null,
    val twoFactorEnforcement: String? = null,
    val sessionTimeoutMinutes: Int? = null,
    val dualSignatureDisbursement: Boolean? = null,
    val anomalyDetectionAlerts: Boolean? = null,
    val dynamicFieldsJson: String? = null,
    val adminUsersJson: String? = null
)

// ==========================================
// Reporting & Financial Analytics Models
// ==========================================

@Serializable
data class PayrollSummaryDto(
    val periodId: String,
    val periodName: String,
    val totalEmployees: Int,
    val paidEmployees: Int,
    val pendingEmployees: Int,
    val stoppedEmployees: Int,
    val totalPayroll: Double,
    val paidAmount: Double,
    val remainingAmount: Double,
    val completionRate: Double,
    val totalSearchFeeIqd: Double,
    val totalSearchFeeUsd: Double,
    val totalRecruitmentFee: Double,
    val totalAbsenceDeductions: Double
)

@Serializable
data class DepartmentExpenseDto(
    val department: String,
    val headcount: Int,
    val totalPayroll: Double,
    val averageSalary: Double,
    val percentage: Double
)

@Serializable
data class CurrencyBreakdownDto(
    val localEmployeesCount: Int,
    val foreignEmployeesCount: Int,
    val localPayrollIqd: Double,
    val foreignPayrollUsd: Double,
    val foreignPayrollIqdEquiv: Double,
    val totalPayrollIqdCombined: Double,
    val usdExchangeRate: Double
)

// ==========================================
// Root & Health Models
// ==========================================

@Serializable
data class ServiceInfoResponse(
    val service: String,
    val version: String,
    val status: String,
    val endpoints: Map<String, String>
)

@Serializable
data class HealthCheckResponse(
    val status: String,
    val database: String,
    val timestamp: String
)

// ==========================================
// Pagination Model
// ==========================================

@Serializable
data class PagedData<T>(
    val items: List<T>,
    val page: Int,
    val pageSize: Int,
    val totalItems: Long,
    val totalPages: Int,
    val hasNext: Boolean,
    val hasPrev: Boolean
)
