package com.payroll.data.database

import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object EmployeesTable : Table("employees") {
    val id = varchar("id", 64)
    val periodId = reference("period_id", PayrollPeriodsTable.id, onDelete = ReferenceOption.CASCADE).index()
    val name = varchar("name", 255)
    val initials = varchar("initials", 16)
    val avatar = text("avatar").nullable()
    val type = varchar("type", 64).default("Full-Time")
    val department = varchar("department", 128)
    val baseSalary = double("base_salary").default(0.0)
    val bonus = double("bonus").default(0.0)
    val insurance = double("insurance").default(0.0)
    val absenceDays = integer("absence_days").default(0)
    val absenceDeduction = double("absence_deduction").default(0.0)
    val searchingDocFee = double("searching_doc_fee").nullable()
    val searchingDocFeeIqd = double("searching_doc_fee_iqd").nullable()
    val isForeign = bool("is_foreign").default(false)
    val currency = varchar("currency", 32).default("Dinar")
    val hasRecruitmentFee = bool("has_recruitment_fee").default(false)
    val recruitmentFee = double("recruitment_fee").nullable()
    val deductions = double("deductions").default(0.0)
    val netSalary = double("net_salary").default(0.0)
    val salaryState = varchar("salary_state", 32).default("Not Yet").index()
    val paidAt = text("paid_at").nullable()
    val status = varchar("status", 32).default("Active").index()
    val email = varchar("email", 255).default("")
    val phone = varchar("phone", 64).default("")
    val joinDate = varchar("join_date", 64)
    val paymentStatus = varchar("payment_status", 32).default("Unpaid")
    val createdAt = datetime("created_at").clientDefault { LocalDateTime.now() }
    val updatedAt = datetime("updated_at").clientDefault { LocalDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}
