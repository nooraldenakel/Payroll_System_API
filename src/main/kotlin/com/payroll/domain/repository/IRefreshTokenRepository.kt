package com.payroll.domain.repository

import com.payroll.domain.models.RefreshTokenDto
import java.time.LocalDateTime

interface IRefreshTokenRepository {
    suspend fun save(id: String, userId: String, token: String, expiresAt: LocalDateTime): RefreshTokenDto
    suspend fun findByToken(token: String): RefreshTokenDto?
    suspend fun revoke(token: String): Boolean
    suspend fun revokeAllForUser(userId: String): Boolean
}
