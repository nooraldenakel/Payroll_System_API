package com.payroll.domain.usecase

import com.payroll.domain.models.CurrencyBreakdownDto
import com.payroll.domain.models.DepartmentExpenseDto
import com.payroll.domain.models.PayrollSummaryDto
import com.payroll.domain.repository.IEmployeeRepository
import com.payroll.domain.repository.IPeriodRepository
import com.payroll.domain.repository.ISettingsRepository

class ReportAnalyticsUseCase(
    private val periodRepo: IPeriodRepository,
    private val employeeRepo: IEmployeeRepository,
    private val settingsRepo: ISettingsRepository
) {
    suspend fun getSummary(periodId: String): PayrollSummaryDto? {
        val period = periodRepo.getById(periodId) ?: return null
        val employees = employeeRepo.getAll(periodId = periodId)

        val totalEmployees = employees.size
        val paidEmployees = employees.count { it.salaryState.equals("Paid", ignoreCase = true) }
        val stoppedEmployees = employees.count { it.salaryState.equals("Stopped", ignoreCase = true) }
        val pendingEmployees = totalEmployees - paidEmployees - stoppedEmployees

        val totalPayroll = employees.sumOf { it.netSalary }
        val paidAmount = employees.filter { it.salaryState.equals("Paid", ignoreCase = true) }.sumOf { it.netSalary }
        val remainingAmount = maxOf(0.0, totalPayroll - paidAmount)
        val completionRate = if (totalPayroll > 0) (paidAmount / totalPayroll) * 100.0 else 0.0

        val totalSearchFeeIqd = employees.filter { !it.isForeign }.sumOf { it.searchingDocFee ?: 0.0 }
        val totalSearchFeeUsd = employees.filter { it.isForeign }.sumOf { it.searchingDocFee ?: 0.0 }
        val totalRecruitmentFee = employees.sumOf { it.recruitmentFee ?: 0.0 }
        val totalAbsenceDeductions = employees.sumOf { it.absenceDeduction }

        return PayrollSummaryDto(
            periodId = period.id,
            periodName = period.name,
            totalEmployees = totalEmployees,
            paidEmployees = paidEmployees,
            pendingEmployees = pendingEmployees,
            stoppedEmployees = stoppedEmployees,
            totalPayroll = totalPayroll,
            paidAmount = paidAmount,
            remainingAmount = remainingAmount,
            completionRate = completionRate,
            totalSearchFeeIqd = totalSearchFeeIqd,
            totalSearchFeeUsd = totalSearchFeeUsd,
            totalRecruitmentFee = totalRecruitmentFee,
            totalAbsenceDeductions = totalAbsenceDeductions
        )
    }

    suspend fun getDepartmentBreakdown(periodId: String): List<DepartmentExpenseDto> {
        val employees = employeeRepo.getAll(periodId = periodId)
        val totalPayrollAll = employees.sumOf { it.netSalary }

        val groups = employees.groupBy { it.department }
        return groups.map { (dept, list) ->
            val totalPayroll = list.sumOf { it.netSalary }
            val avg = if (list.isNotEmpty()) totalPayroll / list.size else 0.0
            val pct = if (totalPayrollAll > 0) (totalPayroll / totalPayrollAll) * 100.0 else 0.0
            DepartmentExpenseDto(
                department = dept,
                headcount = list.size,
                totalPayroll = totalPayroll,
                averageSalary = avg,
                percentage = pct
            )
        }.sortedByDescending { it.totalPayroll }
    }

    suspend fun getCurrencyBreakdown(periodId: String): CurrencyBreakdownDto {
        val employees = employeeRepo.getAll(periodId = periodId)
        val settings = settingsRepo.get()
        val usdRate = settings.usdToDinarRate

        val localEmployees = employees.filter { !it.isForeign }
        val foreignEmployees = employees.filter { it.isForeign }

        val localPayrollIqd = localEmployees.sumOf { it.netSalary }
        val foreignPayrollUsd = foreignEmployees.sumOf { it.netSalary }
        val foreignPayrollIqdEquiv = foreignPayrollUsd * usdRate
        val totalPayrollIqdCombined = localPayrollIqd + foreignPayrollIqdEquiv

        return CurrencyBreakdownDto(
            localEmployeesCount = localEmployees.size,
            foreignEmployeesCount = foreignEmployees.size,
            localPayrollIqd = localPayrollIqd,
            foreignPayrollUsd = foreignPayrollUsd,
            foreignPayrollIqdEquiv = foreignPayrollIqdEquiv,
            totalPayrollIqdCombined = totalPayrollIqdCombined,
            usdExchangeRate = usdRate
        )
    }
}
