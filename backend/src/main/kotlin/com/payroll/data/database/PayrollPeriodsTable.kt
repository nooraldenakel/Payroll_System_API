package com.payroll.data.database

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object PayrollPeriodsTable : Table("payroll_periods") {
    val id = varchar("id", 64)
    val name = varchar("name", 255)
    val ref = varchar("ref", 255)
    val status = varchar("status", 32).default("Draft").index()
    val employeesCount = integer("employees_count").default(0)
    val totalPayroll = double("total_payroll").default(0.0)
    val paidAmount = double("paid_amount").default(0.0)
    val remainingAmount = double("remaining_amount").default(0.0)
    val processedCount = integer("processed_count").default(0)
    val creator = varchar("creator", 255).default("System")
    val createdOn = varchar("created_on", 64)
    val month = varchar("month", 16)
    val year = integer("year")
    val createdAt = datetime("created_at").clientDefault { LocalDateTime.now() }
    val updatedAt = datetime("updated_at").clientDefault { LocalDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}
