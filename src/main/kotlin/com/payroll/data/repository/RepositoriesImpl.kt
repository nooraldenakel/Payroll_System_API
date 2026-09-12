package com.payroll.data.repository

import com.payroll.data.database.*
import com.payroll.data.database.DatabaseFactory.dbQuery
import com.payroll.domain.models.*
import com.payroll.domain.repository.*
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.LocalDateTime
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString

class UserRepositoryImpl : IUserRepository {
    private fun toDto(row: ResultRow): UserDto = UserDto(
        id = row[UsersTable.id],
        email = row[UsersTable.email],
        name = row[UsersTable.name],
        initials = row[UsersTable.initials],
        role = row[UsersTable.role],
        status = row[UsersTable.status],
        avatar = row[UsersTable.avatar],
        activeSessionId = row[UsersTable.activeSessionId]
    )

    override suspend fun getAll(): List<UserDto> = dbQuery {
        UsersTable.selectAll()
            .orderBy(UsersTable.createdAt to SortOrder.ASC)
            .map(::toDto)
    }

    override suspend fun getPaged(page: Int, pageSize: Int): PagedData<UserDto> = dbQuery {
        val validPage = page.coerceAtLeast(1)
        val validPageSize = pageSize.coerceAtLeast(1)
        val total = UsersTable.selectAll().count()
        val totalPages = if (total == 0L) 1 else kotlin.math.ceil(total.toDouble() / validPageSize).toInt()
        val offset = ((validPage - 1) * validPageSize).toLong()
        val items = UsersTable.selectAll()
            .orderBy(UsersTable.createdAt to SortOrder.ASC)
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

    override suspend fun findByEmail(email: String): UserDto? = dbQuery {
        UsersTable.selectAll().where { UsersTable.email.lowerCase() eq email.lowercase() }
            .map(::toDto)
            .singleOrNull()
    }

    override suspend fun findById(id: String): UserDto? = dbQuery {
        UsersTable.selectAll().where { UsersTable.id eq id }
            .map(::toDto)
            .singleOrNull()
    }

    override suspend fun getPasswordHash(email: String): String? = dbQuery {
        UsersTable.selectAll().where { UsersTable.email.lowerCase() eq email.lowercase() }
            .map { it[UsersTable.passwordHash] }
            .singleOrNull()
    }

    override suspend fun createUser(
        id: String,
        email: String,
        passwordHash: String,
        name: String,
        initials: String,
        role: String,
        status: String,
        avatar: String?
    ): UserDto = dbQuery {
        UsersTable.insert {
            it[UsersTable.id] = id
            it[UsersTable.email] = email.lowercase()
            it[UsersTable.passwordHash] = passwordHash
            it[UsersTable.name] = name
            it[UsersTable.initials] = initials
            it[UsersTable.role] = role
            it[UsersTable.status] = status
            it[UsersTable.avatar] = avatar
            it[UsersTable.createdAt] = LocalDateTime.now()
            it[UsersTable.updatedAt] = LocalDateTime.now()
        }
        UsersTable.selectAll().where { UsersTable.id eq id }
            .map(::toDto)
            .singleOrNull() ?: error("Failed to create user")
    }

    override suspend fun updateUser(id: String, req: UpdateUserRequest, passwordHash: String?): UserDto? = dbQuery {
        val updated = UsersTable.update({ UsersTable.id eq id }) {
            req.name?.let { n ->
                it[name] = n
                val inits = n.split(" ").filter { s -> s.isNotBlank() }.take(2).map { s -> s.first() }.joinToString("").uppercase()
                if (inits.isNotBlank()) it[initials] = inits
            }
            req.email?.let { e -> it[email] = e.lowercase() }
            if (passwordHash != null) {
                it[UsersTable.passwordHash] = passwordHash
            }
            req.role?.let { r -> it[role] = r }
            req.status?.let { s -> it[status] = s }
            req.avatar?.let { a -> it[avatar] = a }
            it[updatedAt] = LocalDateTime.now()
        }
        if (updated > 0) {
            UsersTable.selectAll().where { UsersTable.id eq id }
                .map(::toDto)
                .singleOrNull()
        } else null
    }

    override suspend fun deleteUser(id: String): Boolean = dbQuery {
        UsersTable.deleteWhere { UsersTable.id eq id } > 0
    }

    override suspend fun count(): Long = dbQuery {
        UsersTable.selectAll().count()
    }

    override suspend fun updateActiveSession(userId: String, sessionId: String?): Boolean = dbQuery {
        UsersTable.update({ UsersTable.id eq userId }) {
            it[activeSessionId] = sessionId
            it[updatedAt] = LocalDateTime.now()
        } > 0
    }

    override suspend fun getActiveSession(userId: String): String? = dbQuery {
        UsersTable.select(UsersTable.activeSessionId)
            .where { UsersTable.id eq userId }
            .map { it[UsersTable.activeSessionId] }
            .singleOrNull()
    }
}

class PeriodRepositoryImpl : IPeriodRepository {
    private fun toDto(row: ResultRow): PayrollPeriodDto = PayrollPeriodDto(
        id = row[PayrollPeriodsTable.id],
        name = row[PayrollPeriodsTable.name],
        ref = row[PayrollPeriodsTable.ref],
        status = row[PayrollPeriodsTable.status],
        employeesCount = row[PayrollPeriodsTable.employeesCount],
        totalPayroll = row[PayrollPeriodsTable.totalPayroll],
        paidAmount = row[PayrollPeriodsTable.paidAmount],
        remainingAmount = row[PayrollPeriodsTable.remainingAmount],
        processedCount = row[PayrollPeriodsTable.processedCount],
        creator = row[PayrollPeriodsTable.creator],
        createdOn = row[PayrollPeriodsTable.createdOn],
        month = row[PayrollPeriodsTable.month],
        year = row[PayrollPeriodsTable.year],
        createdAt = row[PayrollPeriodsTable.createdAt].toString()
    )

    override suspend fun getAll(): List<PayrollPeriodDto> = dbQuery {
        PayrollPeriodsTable.selectAll()
            .orderBy(PayrollPeriodsTable.createdAt to SortOrder.DESC)
            .map(::toDto)
    }

    override suspend fun getPaged(page: Int, pageSize: Int): PagedData<PayrollPeriodDto> = dbQuery {
        val validPage = page.coerceAtLeast(1)
        val validPageSize = pageSize.coerceAtLeast(1)
        val total = PayrollPeriodsTable.selectAll().count()
        val totalPages = if (total == 0L) 1 else kotlin.math.ceil(total.toDouble() / validPageSize).toInt()
        val offset = ((validPage - 1) * validPageSize).toLong()
        val items = PayrollPeriodsTable.selectAll()
            .orderBy(PayrollPeriodsTable.createdAt to SortOrder.DESC)
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

    override suspend fun getById(id: String): PayrollPeriodDto? = dbQuery {
        PayrollPeriodsTable.selectAll().where { PayrollPeriodsTable.id eq id }
            .map(::toDto)
            .singleOrNull()
    }

    override suspend fun create(request: CreatePeriodRequest): PayrollPeriodDto = dbQuery {
        val periodId = request.id?.takeIf { it.isNotBlank() } ?: "PR-${(1000..9999).random()}"
        val periodRef = request.ref?.takeIf { it.isNotBlank() } ?: "$periodId-gov"

        PayrollPeriodsTable.insert {
            it[id] = periodId
            it[name] = request.name
            it[ref] = periodRef
            it[status] = request.status
            it[employeesCount] = 0
            it[totalPayroll] = 0.0
            it[paidAmount] = 0.0
            it[remainingAmount] = 0.0
            it[processedCount] = 0
            it[creator] = request.creator ?: "System"
            it[createdOn] = LocalDateTime.now().toLocalDate().toString()
            it[month] = request.month
            it[year] = request.year
            it[createdAt] = LocalDateTime.now()
            it[updatedAt] = LocalDateTime.now()
        }
        PayrollPeriodsTable.selectAll().where { PayrollPeriodsTable.id eq periodId }
            .map(::toDto)
            .single()
    }

    override suspend fun update(id: String, request: UpdatePeriodRequest): PayrollPeriodDto? = dbQuery {
        val updatedRows = PayrollPeriodsTable.update({ PayrollPeriodsTable.id eq id }) {
            request.name?.let { n -> it[name] = n }
            request.status?.let { s -> it[status] = s }
            request.totalPayroll?.let { tp -> it[totalPayroll] = tp }
            request.paidAmount?.let { pa -> it[paidAmount] = pa }
            request.remainingAmount?.let { ra -> it[remainingAmount] = ra }
            request.processedCount?.let { pc -> it[processedCount] = pc }
            request.employeesCount?.let { ec -> it[employeesCount] = ec }
            it[updatedAt] = LocalDateTime.now()
        }
        if (updatedRows > 0) PayrollPeriodsTable.selectAll().where { PayrollPeriodsTable.id eq id }.map(::toDto).singleOrNull() else null
    }

    override suspend fun delete(id: String): Boolean = dbQuery {
        PayrollPeriodsTable.deleteWhere { PayrollPeriodsTable.id eq id } > 0
    }

    override suspend fun updateAggregates(
        id: String,
        employeesCount: Int,
        totalPayroll: Double,
        paidAmount: Double,
        remainingAmount: Double,
        processedCount: Int
    ): Boolean = dbQuery {
        PayrollPeriodsTable.update({ PayrollPeriodsTable.id eq id }) {
            it[PayrollPeriodsTable.employeesCount] = employeesCount
            it[PayrollPeriodsTable.totalPayroll] = totalPayroll
            it[PayrollPeriodsTable.paidAmount] = paidAmount
            it[PayrollPeriodsTable.remainingAmount] = remainingAmount
            it[PayrollPeriodsTable.processedCount] = processedCount
            it[updatedAt] = LocalDateTime.now()
        } > 0
    }

    override suspend fun count(): Long = dbQuery {
        PayrollPeriodsTable.selectAll().count()
    }
}

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

class AuditLogRepositoryImpl : IAuditLogRepository {
    private fun toDto(row: ResultRow): AuditLogEntryDto = AuditLogEntryDto(
        id = row[AuditLogsTable.id],
        time = row[AuditLogsTable.time],
        action = row[AuditLogsTable.action],
        user = row[AuditLogsTable.user],
        detail = row[AuditLogsTable.detail],
        icon = row[AuditLogsTable.icon],
        badgeColor = row[AuditLogsTable.badgeColor],
        employeeId = row[AuditLogsTable.employeeId],
        employeeName = row[AuditLogsTable.employeeName],
        category = row[AuditLogsTable.category],
        changes = row[AuditLogsTable.changes],
        createdAt = row[AuditLogsTable.createdAt].toString()
    )

    override suspend fun getAll(category: String?, limit: Int): List<AuditLogEntryDto> = dbQuery {
        var query = AuditLogsTable.selectAll()
        category?.takeIf { it.isNotBlank() && !it.equals("All", ignoreCase = true) }?.let {
            query = query.andWhere { AuditLogsTable.category.lowerCase() eq it.lowercase() }
        }
        query.orderBy(AuditLogsTable.createdAt to SortOrder.DESC)
            .limit(limit)
            .map(::toDto)
    }

    override suspend fun getPaged(category: String?, page: Int, pageSize: Int): PagedData<AuditLogEntryDto> = dbQuery {
        val validPage = page.coerceAtLeast(1)
        val validPageSize = pageSize.coerceAtLeast(1)
        var countQuery = AuditLogsTable.selectAll()
        category?.takeIf { it.isNotBlank() && !it.equals("All", ignoreCase = true) }?.let {
            countQuery = countQuery.andWhere { AuditLogsTable.category.lowerCase() eq it.lowercase() }
        }
        val total = countQuery.count()
        val totalPages = if (total == 0L) 1 else kotlin.math.ceil(total.toDouble() / validPageSize).toInt()
        val offset = ((validPage - 1) * validPageSize).toLong()

        var itemsQuery = AuditLogsTable.selectAll()
        category?.takeIf { it.isNotBlank() && !it.equals("All", ignoreCase = true) }?.let {
            itemsQuery = itemsQuery.andWhere { AuditLogsTable.category.lowerCase() eq it.lowercase() }
        }
        val items = itemsQuery.orderBy(AuditLogsTable.createdAt to SortOrder.DESC)
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

    override suspend fun create(entry: CreateAuditLogRequest): AuditLogEntryDto = dbQuery {
        val logId = "AUD-${(1000..9999).random()}"
        val now = LocalDateTime.now()
        val timeStr = "${now.toLocalTime().toString().take(5)} today"

        AuditLogsTable.insert {
            it[id] = logId
            it[time] = timeStr
            it[action] = entry.action
            it[user] = entry.user
            it[detail] = entry.detail
            it[icon] = entry.icon
            it[badgeColor] = entry.badgeColor
            it[employeeId] = entry.employeeId
            it[employeeName] = entry.employeeName
            it[category] = entry.category
            it[changes] = entry.changes
            it[createdAt] = now
        }

        AuditLogsTable.selectAll().where { AuditLogsTable.id eq logId }
            .map(::toDto)
            .single()
    }
}

class ImportRepositoryImpl : IImportRepository {
    private fun toDto(row: ResultRow): ExcelImportRecordDto = ExcelImportRecordDto(
        id = row[ExcelImportsTable.id],
        fileName = row[ExcelImportsTable.fileName],
        type = row[ExcelImportsTable.type],
        status = row[ExcelImportsTable.status],
        recordsCount = row[ExcelImportsTable.recordsCount],
        errorCount = row[ExcelImportsTable.errorCount],
        importedBy = row[ExcelImportsTable.importedBy],
        date = row[ExcelImportsTable.date],
        createdAt = row[ExcelImportsTable.createdAt].toString()
    )

    override suspend fun getAll(): List<ExcelImportRecordDto> = dbQuery {
        ExcelImportsTable.selectAll()
            .orderBy(ExcelImportsTable.createdAt to SortOrder.DESC)
            .map(::toDto)
    }

    override suspend fun getPaged(page: Int, pageSize: Int): PagedData<ExcelImportRecordDto> = dbQuery {
        val validPage = page.coerceAtLeast(1)
        val validPageSize = pageSize.coerceAtLeast(1)
        val total = ExcelImportsTable.selectAll().count()
        val totalPages = if (total == 0L) 1 else kotlin.math.ceil(total.toDouble() / validPageSize).toInt()
        val offset = ((validPage - 1) * validPageSize).toLong()
        val items = ExcelImportsTable.selectAll()
            .orderBy(ExcelImportsTable.createdAt to SortOrder.DESC)
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

    override suspend fun create(request: CreateImportRecordRequest): ExcelImportRecordDto = dbQuery {
        val recId = "IMP-${(1000..9999).random()}"
        val now = LocalDateTime.now()
        val dateStr = request.date?.takeIf { it.isNotBlank() } ?: "${now.month.name.take(3)} ${now.dayOfMonth}, ${now.toLocalTime().toString().take(5)}"

        ExcelImportsTable.insert {
            it[id] = recId
            it[fileName] = request.fileName
            it[type] = request.type
            it[status] = request.status
            it[recordsCount] = request.recordsCount
            it[errorCount] = request.errorCount
            it[importedBy] = request.importedBy
            it[date] = dateStr
            it[createdAt] = now
        }

        ExcelImportsTable.selectAll().where { ExcelImportsTable.id eq recId }
            .map(::toDto)
            .single()
    }

    override suspend fun delete(id: String?): Boolean = dbQuery {
        if (id != null) {
            ExcelImportsTable.deleteWhere { ExcelImportsTable.id eq id } > 0
        } else {
            ExcelImportsTable.deleteAll() > 0
        }
    }
}

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

class RefreshTokenRepositoryImpl : IRefreshTokenRepository {
    private fun toDto(row: ResultRow): RefreshTokenDto = RefreshTokenDto(
        id = row[RefreshTokensTable.id],
        userId = row[RefreshTokensTable.userId],
        token = row[RefreshTokensTable.token],
        expiresAt = row[RefreshTokensTable.expiresAt].toString(),
        isRevoked = row[RefreshTokensTable.isRevoked],
        createdAt = row[RefreshTokensTable.createdAt].toString()
    )

    override suspend fun save(
        id: String,
        userId: String,
        token: String,
        expiresAt: LocalDateTime
    ): RefreshTokenDto = dbQuery {
        RefreshTokensTable.insert {
            it[RefreshTokensTable.id] = id
            it[RefreshTokensTable.userId] = userId
            it[RefreshTokensTable.token] = token
            it[RefreshTokensTable.expiresAt] = expiresAt
            it[RefreshTokensTable.isRevoked] = false
            it[RefreshTokensTable.createdAt] = LocalDateTime.now()
        }
        RefreshTokensTable.selectAll().where { RefreshTokensTable.id eq id }
            .map(::toDto)
            .single()
    }

    override suspend fun findByToken(token: String): RefreshTokenDto? = dbQuery {
        RefreshTokensTable.selectAll().where { RefreshTokensTable.token eq token }
            .map(::toDto)
            .singleOrNull()
    }

    override suspend fun revoke(token: String): Boolean = dbQuery {
        RefreshTokensTable.update({ RefreshTokensTable.token eq token }) {
            it[isRevoked] = true
        } > 0
    }

    override suspend fun revokeAllForUser(userId: String): Boolean = dbQuery {
        RefreshTokensTable.update({ RefreshTokensTable.userId eq userId }) {
            it[isRevoked] = true
        } > 0
    }
}
