package com.payroll.domain.repository

import com.payroll.domain.models.CreateImportRecordRequest
import com.payroll.domain.models.ExcelImportRecordDto
import com.payroll.domain.models.PagedData

interface IImportRepository {
    suspend fun getAll(): List<ExcelImportRecordDto>
    suspend fun getPaged(page: Int = 1, pageSize: Int = 10): PagedData<ExcelImportRecordDto>
    suspend fun create(request: CreateImportRecordRequest): ExcelImportRecordDto
    suspend fun delete(id: String? = null): Boolean
}
