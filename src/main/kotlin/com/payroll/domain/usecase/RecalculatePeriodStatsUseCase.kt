package com.payroll.domain.usecase

import com.payroll.domain.repository.IEmployeeRepository
import com.payroll.domain.repository.IPeriodRepository

class RecalculatePeriodStatsUseCase(
    private val periodRepo: IPeriodRepository,
    private val employeeRepo: IEmployeeRepository
) {
    suspend fun execute(periodId: String) {
        val employees = employeeRepo.getAll(periodId = periodId)
        val count = employees.size
        val totalPayroll = employees.sumOf { it.netSalary }
        val paidAmount = employees.filter { it.salaryState.equals("Paid", ignoreCase = true) }.sumOf { it.netSalary }
        val remainingAmount = maxOf(0.0, totalPayroll - paidAmount)
        val processedCount = employees.count { it.salaryState.equals("Paid", ignoreCase = true) }

        periodRepo.updateAggregates(
            id = periodId,
            employeesCount = count,
            totalPayroll = totalPayroll,
            paidAmount = paidAmount,
            remainingAmount = remainingAmount,
            processedCount = processedCount
        )
    }
}
