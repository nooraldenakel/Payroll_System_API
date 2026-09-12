package com.payroll.data.repository

import com.payroll.data.database.DatabaseFactory.dbQuery
import com.payroll.data.database.ExcelImportsTable
import com.payroll.domain.models.CreateImportRecordRequest
import com.payroll.domain.models.ExcelImportRecordDto
import com.payroll.domain.models.PagedData
import com.payroll.domain.repository.IImportRepository
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.LocalDateTime

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
