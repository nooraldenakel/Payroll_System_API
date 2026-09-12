package com.payroll.domain.repository

import com.payroll.domain.models.AuditLogEntryDto
import com.payroll.domain.models.CreateAuditLogRequest
import com.payroll.domain.models.PagedData

interface IAuditLogRepository {
    suspend fun getAll(category: String? = null, limit: Int = 100): List<AuditLogEntryDto>
    suspend fun getPaged(category: String? = null, page: Int = 1, pageSize: Int = 10): PagedData<AuditLogEntryDto>
    suspend fun create(entry: CreateAuditLogRequest): AuditLogEntryDto
}
