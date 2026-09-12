package com.payroll.domain.models

import kotlinx.serialization.Serializable

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
