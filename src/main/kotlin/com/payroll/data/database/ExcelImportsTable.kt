package com.payroll.data.database

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object ExcelImportsTable : Table("excel_imports") {
    val id = varchar("id", 64)
    val fileName = varchar("file_name", 255)
    val type = varchar("type", 64).default("Employee Rosters")
    val status = varchar("status", 32).default("Success")
    val recordsCount = integer("records_count").default(0)
    val errorCount = integer("error_count").default(0)
    val importedBy = varchar("imported_by", 255).default("System")
    val date = varchar("date", 64)
    val createdAt = datetime("created_at").clientDefault { LocalDateTime.now() }.index()

    override val primaryKey = PrimaryKey(id)
}
