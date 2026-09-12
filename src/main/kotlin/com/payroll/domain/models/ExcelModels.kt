package com.payroll.domain.models

import kotlinx.serialization.Serializable

@Serializable
data class ExcelImportRecordDto(
    val id: String,
    val fileName: String,
    val type: String,
    val status: String,
    val recordsCount: Int,
    val errorCount: Int,
    val importedBy: String,
    val date: String,
    val createdAt: String
)

@Serializable
data class CreateImportRecordRequest(
    val fileName: String,
    val type: String = "Employee Rosters",
    val status: String = "Success",
    val recordsCount: Int = 0,
    val errorCount: Int = 0,
    val importedBy: String = "System",
    val date: String? = null
)
