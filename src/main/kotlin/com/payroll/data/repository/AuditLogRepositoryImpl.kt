package com.payroll.data.repository

import com.payroll.data.database.AuditLogsTable
import com.payroll.data.database.DatabaseFactory.dbQuery
import com.payroll.domain.models.AuditLogEntryDto
import com.payroll.domain.models.CreateAuditLogRequest
import com.payroll.domain.models.PagedData
import com.payroll.domain.repository.IAuditLogRepository
import org.jetbrains.exposed.sql.*
import java.time.LocalDateTime

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
