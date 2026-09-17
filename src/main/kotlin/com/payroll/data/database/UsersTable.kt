package com.payroll.data.database

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object UsersTable : Table("users") {
    val id = varchar("id", 64)
    val email = varchar("email", 255).uniqueIndex()
    val passwordHash = text("password_hash")
    val name = varchar("name", 255)
    val initials = varchar("initials", 16)
    val role = varchar("role", 64).default("Super Admin")
    val status = varchar("status", 32).default("Active")
    val avatar = text("avatar").nullable()
    val activeSessionId = varchar("active_session_id", 64).nullable()
    val createdAt = datetime("created_at").clientDefault { LocalDateTime.now() }
    val updatedAt = datetime("updated_at").clientDefault { LocalDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}
