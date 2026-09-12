package com.payroll.data.repository

import com.payroll.data.database.DatabaseFactory.dbQuery
import com.payroll.data.database.UsersTable
import com.payroll.domain.models.PagedData
import com.payroll.domain.models.UpdateUserRequest
import com.payroll.domain.models.UserDto
import com.payroll.domain.repository.IUserRepository
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.LocalDateTime

class UserRepositoryImpl : IUserRepository {
    private fun toDto(row: ResultRow): UserDto = UserDto(
        id = row[UsersTable.id],
        email = row[UsersTable.email],
        name = row[UsersTable.name],
        initials = row[UsersTable.initials],
        role = row[UsersTable.role],
        status = row[UsersTable.status],
        avatar = row[UsersTable.avatar],
        activeSessionId = row[UsersTable.activeSessionId]
    )

    override suspend fun getAll(): List<UserDto> = dbQuery {
        UsersTable.selectAll()
            .orderBy(UsersTable.createdAt to SortOrder.ASC)
            .map(::toDto)
    }

    override suspend fun getPaged(page: Int, pageSize: Int): PagedData<UserDto> = dbQuery {
        val validPage = page.coerceAtLeast(1)
        val validPageSize = pageSize.coerceAtLeast(1)
        val total = UsersTable.selectAll().count()
        val totalPages = if (total == 0L) 1 else kotlin.math.ceil(total.toDouble() / validPageSize).toInt()
        val offset = ((validPage - 1) * validPageSize).toLong()
        val items = UsersTable.selectAll()
            .orderBy(UsersTable.createdAt to SortOrder.ASC)
            .limit(validPageSize).offset(offset)
            .map(::toDto)

        PagedData(
            items = items,
            page = validPage,
            pageSize = validPageSize,
            totalItems = total,
            totalPages = totalPages,
            hasNext = validPage < totalPages,
            hasPrev = validPage > 1
        )
    }

    override suspend fun findByEmail(email: String): UserDto? = dbQuery {
        UsersTable.selectAll().where { UsersTable.email.lowerCase() eq email.lowercase() }
            .map(::toDto)
            .singleOrNull()
    }

    override suspend fun findById(id: String): UserDto? = dbQuery {
        UsersTable.selectAll().where { UsersTable.id eq id }
            .map(::toDto)
            .singleOrNull()
    }

    override suspend fun getPasswordHash(email: String): String? = dbQuery {
        UsersTable.selectAll().where { UsersTable.email.lowerCase() eq email.lowercase() }
            .map { it[UsersTable.passwordHash] }
            .singleOrNull()
    }

    override suspend fun createUser(
        id: String,
        email: String,
        passwordHash: String,
        name: String,
        initials: String,
        role: String,
        status: String,
        avatar: String?
    ): UserDto = dbQuery {
        UsersTable.insert {
            it[UsersTable.id] = id
            it[UsersTable.email] = email.lowercase()
            it[UsersTable.passwordHash] = passwordHash
            it[UsersTable.name] = name
            it[UsersTable.initials] = initials
            it[UsersTable.role] = role
            it[UsersTable.status] = status
            it[UsersTable.avatar] = avatar
            it[UsersTable.createdAt] = LocalDateTime.now()
            it[UsersTable.updatedAt] = LocalDateTime.now()
        }
        UsersTable.selectAll().where { UsersTable.id eq id }
            .map(::toDto)
            .singleOrNull() ?: error("Failed to create user")
    }

    override suspend fun updateUser(id: String, req: UpdateUserRequest, passwordHash: String?): UserDto? = dbQuery {
        val updated = UsersTable.update({ UsersTable.id eq id }) {
            req.name?.let { n ->
                it[name] = n
                val inits = n.split(" ").filter { s -> s.isNotBlank() }.take(2).map { s -> s.first() }.joinToString("").uppercase()
                if (inits.isNotBlank()) it[initials] = inits
            }
            req.email?.let { e -> it[email] = e.lowercase() }
            if (passwordHash != null) {
                it[UsersTable.passwordHash] = passwordHash
            }
            req.role?.let { r -> it[role] = r }
            req.status?.let { s -> it[status] = s }
            req.avatar?.let { a -> it[avatar] = a }
            it[updatedAt] = LocalDateTime.now()
        }
        if (updated > 0) {
            UsersTable.selectAll().where { UsersTable.id eq id }
                .map(::toDto)
                .singleOrNull()
        } else null
    }

    override suspend fun deleteUser(id: String): Boolean = dbQuery {
        UsersTable.deleteWhere { UsersTable.id eq id } > 0
    }

    override suspend fun count(): Long = dbQuery {
        UsersTable.selectAll().count()
    }

    override suspend fun updateActiveSession(userId: String, sessionId: String?): Boolean = dbQuery {
        UsersTable.update({ UsersTable.id eq userId }) {
            it[activeSessionId] = sessionId
            it[updatedAt] = LocalDateTime.now()
        } > 0
    }

    override suspend fun getActiveSession(userId: String): String? = dbQuery {
        UsersTable.select(UsersTable.activeSessionId)
            .where { UsersTable.id eq userId }
            .map { it[UsersTable.activeSessionId] }
            .singleOrNull()
    }
}
