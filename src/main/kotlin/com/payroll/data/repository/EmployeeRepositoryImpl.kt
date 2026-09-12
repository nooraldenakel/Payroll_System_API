package com.payroll.data.repository

import com.payroll.data.database.DatabaseFactory.dbQuery
import com.payroll.data.database.EmployeesTable
import com.payroll.domain.models.EmployeeDto
import com.payroll.domain.models.PagedData
import com.payroll.domain.models.UpdateEmployeeRequest
import com.payroll.domain.repository.IEmployeeRepository
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.LocalDateTime

class EmployeeRepositoryImpl : IEmployeeRepository {
    private fun toDto(row: ResultRow): EmployeeDto = EmployeeDto(
        id = row[EmployeesTable.id],
        periodId = row[EmployeesTable.periodId],
        name = row[EmployeesTable.name],
        initials = row[EmployeesTable.initials],
        avatar = row[EmployeesTable.avatar],
        type = row[EmployeesTable.type],
        department = row[EmployeesTable.department],
        baseSalary = row[EmployeesTable.baseSalary],
        bonus = row[EmployeesTable.bonus],
        insurance = row[EmployeesTable.insurance],
        absenceDays = row[EmployeesTable.absenceDays],
        absenceDeduction = row[EmployeesTable.absenceDeduction],
        searchingDocFee = row[EmployeesTable.searchingDocFee],
        searchingDocFeeIqd = row[EmployeesTable.searchingDocFeeIqd],
        isForeign = row[EmployeesTable.isForeign],
        currency = row[EmployeesTable.currency],
        hasRecruitmentFee = row[EmployeesTable.hasRecruitmentFee],
        recruitmentFee = row[EmployeesTable.recruitmentFee],
        deductions = row[EmployeesTable.deductions],
        netSalary = row[EmployeesTable.netSalary],
        salaryState = row[EmployeesTable.salaryState],
        paidAt = row[EmployeesTable.paidAt],
        status = row[EmployeesTable.status],
        email = row[EmployeesTable.email],
        phone = row[EmployeesTable.phone],
        joinDate = row[EmployeesTable.joinDate],
        paymentStatus = row[EmployeesTable.paymentStatus],
        createdAt = row[EmployeesTable.createdAt].toString()
    )

    private fun buildEmployeeQuery(
        periodId: String?,
        department: String?,
        salaryState: String?,
        search: String?
    ): Query {
        var query = EmployeesTable.selectAll()
        periodId?.takeIf { it.isNotBlank() }?.let {
            query = query.andWhere { EmployeesTable.periodId eq it }
        }
        department?.takeIf { it.isNotBlank() && !it.equals("All", ignoreCase = true) }?.let {
            query = query.andWhere { EmployeesTable.department eq it }
        }
        salaryState?.takeIf { it.isNotBlank() && !it.equals("All", ignoreCase = true) }?.let {
            query = query.andWhere { EmployeesTable.salaryState.lowerCase() eq it.lowercase() }
        }
        search?.takeIf { it.isNotBlank() }?.let {
            val term = "%${it.lowercase()}%"
            query = query.andWhere {
                (EmployeesTable.name.lowerCase() like term) or
                (EmployeesTable.id.lowerCase() like term) or
                (EmployeesTable.department.lowerCase() like term)
            }
        }
        return query
    }

    override suspend fun getAll(
        periodId: String?,
        department: String?,
        salaryState: String?,
        search: String?
    ): List<EmployeeDto> = dbQuery {
        buildEmployeeQuery(periodId, department, salaryState, search)
            .orderBy(EmployeesTable.createdAt to SortOrder.DESC)
            .map(::toDto)
    }

    override suspend fun getPaged(
        periodId: String?,
        department: String?,
        salaryState: String?,
        search: String?,
        page: Int,
        pageSize: Int
    ): PagedData<EmployeeDto> = dbQuery {
        val validPage = page.coerceAtLeast(1)
        val validPageSize = pageSize.coerceAtLeast(1)
        val total = buildEmployeeQuery(periodId, department, salaryState, search).count()
        val totalPages = if (total == 0L) 1 else kotlin.math.ceil(total.toDouble() / validPageSize).toInt()
        val offset = ((validPage - 1) * validPageSize).toLong()
        val items = buildEmployeeQuery(periodId, department, salaryState, search)
            .orderBy(EmployeesTable.createdAt to SortOrder.DESC)
            .limit(validPageSize).offset(offset)
            .map(::toDto)

        PagedData(
            items = items,
            page = validPage,
            pageSize = validPageSize,
            totalItems = total,
            totalPages = totalPages,
            hasNext = validPage < totalPages,
            hasPrev = validPage > 1
        )
    }

    override suspend fun getById(id: String): EmployeeDto? = dbQuery {
        EmployeesTable.selectAll().where { EmployeesTable.id eq id }
            .map(::toDto)
            .singleOrNull()
    }

    override suspend fun create(employee: EmployeeDto): EmployeeDto = dbQuery {
        EmployeesTable.insert {
            it[id] = employee.id
            it[periodId] = employee.periodId
            it[name] = employee.name
            it[initials] = employee.initials
            it[avatar] = employee.avatar
            it[type] = employee.type
            it[department] = employee.department
            it[baseSalary] = employee.baseSalary
            it[bonus] = employee.bonus
            it[insurance] = employee.insurance
            it[absenceDays] = employee.absenceDays
            it[absenceDeduction] = employee.absenceDeduction
            it[searchingDocFee] = employee.searchingDocFee
            it[searchingDocFeeIqd] = employee.searchingDocFeeIqd
            it[isForeign] = employee.isForeign
            it[currency] = employee.currency
            it[hasRecruitmentFee] = employee.hasRecruitmentFee
            it[recruitmentFee] = employee.recruitmentFee
            it[deductions] = employee.deductions
            it[netSalary] = employee.netSalary
            it[salaryState] = employee.salaryState
            it[paidAt] = employee.paidAt
            it[status] = employee.status
            it[email] = employee.email
            it[phone] = employee.phone
            it[joinDate] = employee.joinDate
            it[paymentStatus] = employee.paymentStatus
            it[createdAt] = LocalDateTime.now()
            it[updatedAt] = LocalDateTime.now()
        }
        EmployeesTable.selectAll().where { EmployeesTable.id eq employee.id }
            .map(::toDto)
            .single()
    }

    override suspend fun update(
        id: String,
        updates: UpdateEmployeeRequest,
        calculatedNetSalary: Double,
        calculatedDeductions: Double,
        calculatedFeeIqd: Double?
    ): EmployeeDto? = dbQuery {
        val updated = EmployeesTable.update({ EmployeesTable.id eq id }) {
            updates.periodId?.let { pId -> it[periodId] = pId }
            updates.name?.let { n -> it[name] = n }
            updates.initials?.let { ini -> it[initials] = ini }
            updates.avatar?.let { av -> it[avatar] = av }
            updates.type?.let { t -> it[type] = t }
            updates.department?.let { d -> it[department] = d }
            updates.baseSalary?.let { bs -> it[baseSalary] = bs }
            updates.bonus?.let { b -> it[bonus] = b }
            updates.insurance?.let { ins -> it[insurance] = ins }
            updates.absenceDays?.let { ad -> it[absenceDays] = ad }
            updates.absenceDeduction?.let { add -> it[absenceDeduction] = add }
            updates.searchingDocFee?.let { sf -> it[searchingDocFee] = sf }
            it[searchingDocFeeIqd] = calculatedFeeIqd
            updates.isForeign?.let { isf -> it[isForeign] = isf }
            updates.currency?.let { c -> it[currency] = c }
            updates.hasRecruitmentFee?.let { hrf -> it[hasRecruitmentFee] = hrf }
            updates.recruitmentFee?.let { rf -> it[recruitmentFee] = rf }
            it[deductions] = calculatedDeductions
            it[netSalary] = calculatedNetSalary
            updates.salaryState?.let { ss ->
                it[salaryState] = ss
                if (ss.equals("Paid", ignoreCase = true)) {
                    it[paymentStatus] = "Paid"
                    if (updates.paidAt == null) it[paidAt] = LocalDateTime.now().toString()
                } else {
                    it[paymentStatus] = "Unpaid"
                    it[paidAt] = null
                }
            }
            updates.paidAt?.let { pa -> it[paidAt] = pa }
            updates.status?.let { s -> it[status] = s }
            updates.email?.let { em -> it[email] = em }
            updates.phone?.let { ph -> it[phone] = ph }
            updates.joinDate?.let { jd -> it[joinDate] = jd }
            updates.paymentStatus?.let { ps -> it[paymentStatus] = ps }
            it[updatedAt] = LocalDateTime.now()
        }
        if (updated > 0) EmployeesTable.selectAll().where { EmployeesTable.id eq id }.map(::toDto).singleOrNull() else null
    }

    override suspend fun updatePaymentState(id: String, nextState: String, paidAt: String?): EmployeeDto? = dbQuery {
        val updated = EmployeesTable.update({ EmployeesTable.id eq id }) {
            it[salaryState] = nextState
            it[paymentStatus] = if (nextState.equals("Paid", ignoreCase = true)) "Paid" else "Unpaid"
            it[EmployeesTable.paidAt] = paidAt
            it[updatedAt] = LocalDateTime.now()
        }
        if (updated > 0) EmployeesTable.selectAll().where { EmployeesTable.id eq id }.map(::toDto).singleOrNull() else null
    }

    override suspend fun delete(id: String): Boolean = dbQuery {
        EmployeesTable.deleteWhere { EmployeesTable.id eq id } > 0
    }

    override suspend fun batchCreate(employees: List<EmployeeDto>): Int = dbQuery {
        var count = 0
        for (emp in employees) {
            EmployeesTable.insert {
                it[id] = emp.id
                it[periodId] = emp.periodId
                it[name] = emp.name
                it[initials] = emp.initials
                it[avatar] = emp.avatar
                it[type] = emp.type
                it[department] = emp.department
                it[baseSalary] = emp.baseSalary
                it[bonus] = emp.bonus
                it[insurance] = emp.insurance
                it[absenceDays] = emp.absenceDays
                it[absenceDeduction] = emp.absenceDeduction
                it[searchingDocFee] = emp.searchingDocFee
                it[searchingDocFeeIqd] = emp.searchingDocFeeIqd
                it[isForeign] = emp.isForeign
                it[currency] = emp.currency
                it[hasRecruitmentFee] = emp.hasRecruitmentFee
                it[recruitmentFee] = emp.recruitmentFee
                it[deductions] = emp.deductions
                it[netSalary] = emp.netSalary
                it[salaryState] = emp.salaryState
                it[paidAt] = emp.paidAt
                it[status] = emp.status
                it[email] = emp.email
                it[phone] = emp.phone
                it[joinDate] = emp.joinDate
                it[paymentStatus] = emp.paymentStatus
                it[createdAt] = LocalDateTime.now()
                it[updatedAt] = LocalDateTime.now()
            }
            count++
        }
        count
    }

    override suspend fun count(periodId: String?): Long = dbQuery {
        var q = EmployeesTable.selectAll()
        if (periodId != null) q = q.andWhere { EmployeesTable.periodId eq periodId }
        q.count()
    }
}
