package com.payroll.data.repository

import com.payroll.data.database.DatabaseFactory.dbQuery
import com.payroll.data.database.RefreshTokensTable
import com.payroll.domain.models.RefreshTokenDto
import com.payroll.domain.repository.IRefreshTokenRepository
import org.jetbrains.exposed.sql.*
import java.time.LocalDateTime

class RefreshTokenRepositoryImpl : IRefreshTokenRepository {
    private fun toDto(row: ResultRow): RefreshTokenDto = RefreshTokenDto(
        id = row[RefreshTokensTable.id],
        userId = row[RefreshTokensTable.userId],
        token = row[RefreshTokensTable.token],
        expiresAt = row[RefreshTokensTable.expiresAt].toString(),
        isRevoked = row[RefreshTokensTable.isRevoked],
        createdAt = row[RefreshTokensTable.createdAt].toString()
    )

    override suspend fun save(
        id: String,
        userId: String,
        token: String,
        expiresAt: LocalDateTime
    ): RefreshTokenDto = dbQuery {
        RefreshTokensTable.insert {
            it[RefreshTokensTable.id] = id
            it[RefreshTokensTable.userId] = userId
            it[RefreshTokensTable.token] = token
            it[RefreshTokensTable.expiresAt] = expiresAt
            it[RefreshTokensTable.isRevoked] = false
            it[RefreshTokensTable.createdAt] = LocalDateTime.now()
        }
        RefreshTokensTable.selectAll().where { RefreshTokensTable.id eq id }
            .map(::toDto)
            .single()
    }

    override suspend fun findByToken(token: String): RefreshTokenDto? = dbQuery {
        RefreshTokensTable.selectAll().where { RefreshTokensTable.token eq token }
            .map(::toDto)
            .singleOrNull()
    }

    override suspend fun revoke(token: String): Boolean = dbQuery {
        RefreshTokensTable.update({ RefreshTokensTable.token eq token }) {
            it[isRevoked] = true
        } > 0
    }

    override suspend fun revokeAllForUser(userId: String): Boolean = dbQuery {
        RefreshTokensTable.update({ RefreshTokensTable.userId eq userId }) {
            it[isRevoked] = true
        } > 0
    }
}
