package com.payroll.domain.repository

import com.payroll.domain.models.ColumnConfigDto
import com.payroll.domain.models.SystemSettingsDto
import com.payroll.domain.models.UpdateSettingsRequest

interface ISettingsRepository {
    suspend fun get(): SystemSettingsDto
    suspend fun update(updates: UpdateSettingsRequest): SystemSettingsDto
    suspend fun getColumns(): List<ColumnConfigDto>
    suspend fun updateColumns(columns: List<ColumnConfigDto>): List<ColumnConfigDto>
}
