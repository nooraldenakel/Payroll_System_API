package com.payroll.data.repository

import com.payroll.data.database.DatabaseFactory.dbQuery
import com.payroll.data.database.PayrollPeriodsTable
import com.payroll.domain.models.CreatePeriodRequest
import com.payroll.domain.models.PagedData
import com.payroll.domain.models.PayrollPeriodDto
import com.payroll.domain.models.UpdatePeriodRequest
import com.payroll.domain.repository.IPeriodRepository
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.LocalDateTime

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
