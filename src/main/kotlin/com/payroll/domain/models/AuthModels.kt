package com.payroll.domain.models

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class LoginResponse(
    val user: UserDto,
    val accessToken: String,
    val refreshToken: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long = 86400, // 24 hours in seconds
    val token: String? = null // Backward compatibility
)

@Serializable
data class RefreshTokenRequest(
    val refreshToken: String
)

@Serializable
data class RefreshTokenResponse(
    val accessToken: String,
    val refreshToken: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long = 86400,
    val token: String? = null
)

@Serializable
data class RefreshTokenDto(
    val id: String,
    val userId: String,
    val token: String,
    val expiresAt: String,
    val isRevoked: Boolean,
    val createdAt: String
)
