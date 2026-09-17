package com.payroll.domain.models

import kotlinx.serialization.Serializable

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val name: String,
    val initials: String,
    val role: String,
    val status: String,
    val avatar: String? = null,
    val activeSessionId: String? = null
)

@Serializable
data class CreateUserRequest(
    val email: String,
    val password: String,
    val name: String,
    val initials: String? = null,
    val role: String = "Editor",
    val status: String = "Active",
    val avatar: String? = null
)

@Serializable
data class UpdateUserRequest(
    val name: String? = null,
    val initials: String? = null,
    val email: String? = null,
    val password: String? = null,
    val role: String? = null,
    val status: String? = null,
    val avatar: String? = null
)
