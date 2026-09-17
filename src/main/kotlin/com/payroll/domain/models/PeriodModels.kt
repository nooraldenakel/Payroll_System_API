package com.payroll.domain.models

import kotlinx.serialization.Serializable

@Serializable
data class PayrollPeriodDto(
    val id: String,
    val name: String,
    val ref: String,
    val status: String,
    val employeesCount: Int,
    val totalPayroll: Double,
    val paidAmount: Double,
    val remainingAmount: Double,
    val processedCount: Int,
    val creator: String,
    val createdOn: String,
    val month: String,
    val year: Int,
    val createdAt: String
)

@Serializable
data class CreatePeriodRequest(
    val id: String? = null,
    val name: String,
    val ref: String? = null,
    val status: String = "Draft",
    val month: String = "AUG",
    val year: Int = 2026,
    val creator: String? = null
)

@Serializable
data class UpdatePeriodRequest(
    val name: String? = null,
    val status: String? = null,
    val totalPayroll: Double? = null,
    val paidAmount: Double? = null,
    val remainingAmount: Double? = null,
    val processedCount: Int? = null,
    val employeesCount: Int? = null
)
