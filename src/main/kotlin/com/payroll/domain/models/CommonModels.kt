package com.payroll.domain.models

import kotlinx.serialization.Serializable

@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val message: String? = null,
    val data: T? = null,
    val code: String? = null
)

@Serializable
data class SimpleResponse(
    val success: Boolean,
    val message: String? = null
)

@Serializable
data class PagedData<T>(
    val items: List<T>,
    val page: Int,
    val pageSize: Int,
    val totalItems: Long,
    val totalPages: Int,
    val hasNext: Boolean,
    val hasPrev: Boolean
)

@Serializable
data class ServiceInfoResponse(
    val service: String,
    val version: String,
    val status: String,
    val endpoints: Map<String, String>
)

@Serializable
data class HealthCheckResponse(
    val status: String,
    val database: String,
    val timestamp: String
)
