package com.payroll.data.database

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object AuditLogsTable : Table("audit_logs") {
    val id = varchar("id", 64)
    val time = varchar("time", 64)
    val action = varchar("action", 255)
    val user = varchar("user_name", 255)
    val detail = text("detail")
    val icon = varchar("icon", 64).default("history")
    val badgeColor = varchar("badge_color", 128).default("bg-blue-50 text-blue-700 border border-blue-200")
    val employeeId = varchar("employee_id", 64).nullable()
    val employeeName = varchar("employee_name", 255).nullable()
    val category = varchar("category", 64).nullable().index()
    val changes = text("changes").nullable()
    val createdAt = datetime("created_at").clientDefault { LocalDateTime.now() }.index()

    override val primaryKey = PrimaryKey(id)
}
