package com.payroll.domain.usecase

import com.payroll.domain.models.*
import com.payroll.domain.repository.IAuditLogRepository
import com.payroll.domain.repository.IEmployeeRepository
import com.payroll.domain.repository.IPeriodRepository
import java.time.LocalDateTime

class ManageEmployeeUseCase(
    private val employeeRepo: IEmployeeRepository,
    private val periodRepo: IPeriodRepository,
    private val auditRepo: IAuditLogRepository,
    private val calcUseCase: CalculateSalaryUseCase,
    private val recalculatePeriodStats: RecalculatePeriodStatsUseCase
) {
    suspend fun createEmployee(req: CreateEmployeeRequest, operator: String = "System"): EmployeeDto {
        val id = req.id?.takeIf { it.isNotBlank() } ?: "EMP-${(1000..9999).random()}"
        val initials = req.initials?.takeIf { it.isNotBlank() }
            ?: req.name.split(" ").filter { it.isNotBlank() }.map { it.first() }.take(2).joinToString("").uppercase().ifBlank { "EM" }

        val absenceCost = if (req.absenceDays > 0 && req.baseSalary > 0.0) {
            Math.round((req.baseSalary / 30.0 * req.absenceDays) * 100.0) / 100.0
        } else {
            req.absenceDeduction
        }

        val (netSalary, deductions, feeIqd) = calcUseCase.calculate(
            baseSalary = req.baseSalary,
            bonus = req.bonus,
            insurance = req.insurance,
            absenceDeduction = absenceCost,
            absenceDays = req.absenceDays,
            recruitmentFee = req.recruitmentFee,
            searchingDocFee = req.searchingDocFee,
            isForeign = req.isForeign
        )

        val currency = req.currency?.takeIf { it.isNotBlank() } ?: (if (req.isForeign) "USD" else "Dinar")
        val joinDate = req.joinDate?.takeIf { it.isNotBlank() } ?: LocalDateTime.now().toLocalDate().toString()
        val paymentStatus = if (req.salaryState.equals("Paid", ignoreCase = true)) "Paid" else "Unpaid"
        val paidAt = if (paymentStatus == "Paid") LocalDateTime.now().toString() else req.paidAt

        val employee = EmployeeDto(
            id = id,
            periodId = req.periodId,
            name = req.name,
            initials = initials,
            avatar = req.avatar,
            type = req.type,
            department = req.department,
            baseSalary = req.baseSalary,
            bonus = req.bonus,
            insurance = req.insurance,
            absenceDays = req.absenceDays,
            absenceDeduction = absenceCost,
            searchingDocFee = req.searchingDocFee,
            searchingDocFeeIqd = feeIqd,
            isForeign = req.isForeign,
            currency = currency,
            hasRecruitmentFee = req.hasRecruitmentFee,
            recruitmentFee = req.recruitmentFee,
            deductions = deductions,
            netSalary = netSalary,
            salaryState = req.salaryState,
            paidAt = paidAt,
            status = req.status,
            email = req.email ?: "",
            phone = req.phone ?: "",
            joinDate = joinDate,
            paymentStatus = paymentStatus,
            createdAt = LocalDateTime.now().toString()
        )

        val created = employeeRepo.create(employee)
        recalculatePeriodStats.execute(req.periodId)

        auditRepo.create(
            CreateAuditLogRequest(
                action = "Employee Enrolled",
                user = operator,
                detail = "Enrolled ${created.name} (${created.id}) in ${created.department} with net salary ${created.netSalary} ${created.currency}",
                icon = "person_add",
                badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-200",
                employeeId = created.id,
                employeeName = created.name,
                category = "Employee"
            )
        )

        return created
    }

    suspend fun updateEmployee(id: String, req: UpdateEmployeeRequest, operator: String = "System"): EmployeeDto? {
        val current = employeeRepo.getById(id) ?: return null

        val baseSalary = req.baseSalary ?: current.baseSalary
        val bonus = req.bonus ?: current.bonus
        val insurance = req.insurance ?: current.insurance
        val absenceDays = req.absenceDays ?: current.absenceDays
        val absenceDeduction = if (absenceDays > 0 && baseSalary > 0.0) {
            Math.round((baseSalary / 30.0 * absenceDays) * 100.0) / 100.0
        } else {
            req.absenceDeduction ?: current.absenceDeduction
        }
        val recruitmentFee = req.recruitmentFee ?: current.recruitmentFee
        val searchingDocFee = req.searchingDocFee ?: current.searchingDocFee
        val isForeign = req.isForeign ?: current.isForeign

        val (netSalary, deductions, feeIqd) = calcUseCase.calculate(
            baseSalary = baseSalary,
            bonus = bonus,
            insurance = insurance,
            absenceDeduction = absenceDeduction,
            absenceDays = absenceDays,
            recruitmentFee = recruitmentFee,
            searchingDocFee = searchingDocFee,
            isForeign = isForeign
        )

        val effectiveReq = req.copy(
            absenceDays = absenceDays,
            absenceDeduction = absenceDeduction
        )

        val updated = employeeRepo.update(
            id = id,
            updates = effectiveReq,
            calculatedNetSalary = netSalary,
            calculatedDeductions = deductions,
            calculatedFeeIqd = feeIqd
        )

        if (updated != null) {
            recalculatePeriodStats.execute(updated.periodId)
            auditRepo.create(
                CreateAuditLogRequest(
                    action = "Employee Updated",
                    user = operator,
                    detail = "Updated payroll details for ${updated.name} (${updated.id}). New net: ${updated.netSalary}",
                    icon = "edit",
                    badgeColor = "bg-blue-50 text-blue-700 border border-blue-200",
                    employeeId = updated.id,
                    employeeName = updated.name,
                    category = "Salary"
                )
            )
        }

        return updated
    }

    suspend fun toggleSalaryPayment(id: String, nextStateInput: String?, operator: String = "System"): EmployeeDto? {
        val current = employeeRepo.getById(id) ?: return null

        val nextState = when (nextStateInput?.lowercase()) {
            "paid" -> "Paid"
            "stopped" -> "Stopped"
            "not yet", "unpaid" -> "Not Yet"
            else -> if (current.salaryState.equals("Paid", ignoreCase = true)) "Not Yet" else "Paid"
        }

        val paidAt = if (nextState == "Paid") LocalDateTime.now().toString() else null
        val updated = employeeRepo.updatePaymentState(id, nextState, paidAt)

        if (updated != null) {
            recalculatePeriodStats.execute(updated.periodId)
            auditRepo.create(
                CreateAuditLogRequest(
                    action = if (nextState == "Paid") "Salary Disbursed" else "Salary Payment Updated",
                    user = operator,
                    detail = "Payment status for ${updated.name} changed to '$nextState' (Net: ${updated.netSalary} ${updated.currency})",
                    icon = if (nextState == "Paid") "check_circle" else "history",
                    badgeColor = if (nextState == "Paid") "bg-emerald-50 text-emerald-700 border border-emerald-200" else "bg-amber-50 text-amber-700 border border-amber-200",
                    employeeId = updated.id,
                    employeeName = updated.name,
                    category = "Salary"
                )
            )
        }

        return updated
    }

    suspend fun deleteEmployee(id: String, operator: String = "System"): Boolean {
        val current = employeeRepo.getById(id) ?: return false
        val success = employeeRepo.delete(id)
        if (success) {
            recalculatePeriodStats.execute(current.periodId)
            auditRepo.create(
                CreateAuditLogRequest(
                    action = "Employee Terminated",
                    user = operator,
                    detail = "Deleted record for ${current.name} (${current.id}) from period ${current.periodId}",
                    icon = "delete",
                    badgeColor = "bg-rose-50 text-rose-700 border border-rose-200",
                    employeeId = current.id,
                    employeeName = current.name,
                    category = "Employee"
                )
            )
        }
        return success
    }
}
