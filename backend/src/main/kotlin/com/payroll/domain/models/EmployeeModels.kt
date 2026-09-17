package com.payroll.domain.models

import kotlinx.serialization.Serializable

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
