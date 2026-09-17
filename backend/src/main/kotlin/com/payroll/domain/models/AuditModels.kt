package com.payroll.domain.models

import kotlinx.serialization.Serializable

@Serializable
data class AuditLogEntryDto(
    val id: String,
    val time: String,
    val action: String,
    val user: String,
    val detail: String,
    val icon: String,
    val badgeColor: String,
    val employeeId: String? = null,
    val employeeName: String? = null,
    val category: String? = null,
    val changes: String? = null,
    val createdAt: String
)

@Serializable
data class CreateAuditLogRequest(
    val action: String,
    val user: String = "System",
    val detail: String,
    val icon: String = "history",
    val badgeColor: String = "bg-blue-50 text-blue-700 border border-blue-200",
    val employeeId: String? = null,
    val employeeName: String? = null,
    val category: String = "System",
    val changes: String? = null
)
