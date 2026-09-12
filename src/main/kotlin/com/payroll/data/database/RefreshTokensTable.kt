package com.payroll.data.database

import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object RefreshTokensTable : Table("refresh_tokens") {
    val id = varchar("id", 64)
    val userId = reference("user_id", UsersTable.id, onDelete = ReferenceOption.CASCADE).index()
    val token = text("token").uniqueIndex()
    val expiresAt = datetime("expires_at")
    val isRevoked = bool("is_revoked").default(false)
    val createdAt = datetime("created_at").clientDefault { LocalDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}
