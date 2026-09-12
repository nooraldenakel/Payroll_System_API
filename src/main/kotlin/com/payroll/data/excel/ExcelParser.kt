package com.payroll.data.excel

import com.payroll.domain.models.CreateEmployeeRequest
import org.apache.poi.ss.usermodel.*
import java.io.InputStream

data class ExcelParseResult(
    val employees: List<CreateEmployeeRequest>,
    val errors: List<String>,
    val totalRowsProcessed: Int
)

class ExcelParser {
    fun parse(inputStream: InputStream, periodId: String): ExcelParseResult {
        val workbook = WorkbookFactory.create(inputStream)
        val sheet = workbook.getSheetAt(0) ?: error("Excel workbook contains no sheets")

        val headerRow = sheet.getRow(0) ?: error("Excel sheet is empty: missing header row")
        val headerMap = mutableMapOf<String, Int>()

        for (cell in headerRow) {
            val name = cell.stringCellValue.trim().lowercase()
            headerMap[name] = cell.columnIndex
        }

        fun findColumn(vararg aliases: String): Int? {
            for (alias in aliases) {
                val idx = headerMap[alias.lowercase()]
                if (idx != null) return idx
            }
            return null
        }

        val nameCol = findColumn("name", "employee name", "full name", "employee", "staff name") ?: 0
        val deptCol = findColumn("department", "dept", "division", "unit")
        val typeCol = findColumn("type", "employment type", "contract type")
        val baseSalaryCol = findColumn("base salary", "basic salary", "salary", "base pay", "net base")
        val bonusCol = findColumn("bonus", "allowance", "incentive")
        val insuranceCol = findColumn("insurance", "health insurance", "social security")
        val absenceDaysCol = findColumn("absence days", "absences", "absence count")
        val absenceDedCol = findColumn("absence deduction", "absence fee", "absence penalty")
        val searchFeeCol = findColumn("search fee", "searching fee", "searching doc fee", "doc fee", "search")
        val foreignCol = findColumn("foreign", "is foreign", "nationality", "citizenship", "alien")
        val currencyCol = findColumn("currency", "curr")
        val recruitmentCol = findColumn("recruitment fee", "recruitment", "hiring fee")
        val emailCol = findColumn("email", "e-mail", "mail")
        val phoneCol = findColumn("phone", "mobile", "telephone", "contact")

        val parsedList = mutableListOf<CreateEmployeeRequest>()
        val errorList = mutableListOf<String>()
        var processedCount = 0

        for (rowIdx in 1..sheet.lastRowNum) {
            val row = sheet.getRow(rowIdx) ?: continue
            val rawName = getCellString(row.getCell(nameCol))

            if (rawName.isBlank()) continue // skip empty rows
            processedCount++

            try {
                val dept = deptCol?.let { getCellString(row.getCell(it)).ifBlank { null } } ?: "Operations"
                val empType = typeCol?.let { getCellString(row.getCell(it)).ifBlank { null } } ?: "Full-Time"
                val baseSalary = baseSalaryCol?.let { getCellDouble(row.getCell(it)) } ?: 0.0
                val bonus = bonusCol?.let { getCellDouble(row.getCell(it)) } ?: 0.0
                val insurance = insuranceCol?.let { getCellDouble(row.getCell(it)) } ?: 0.0
                val absenceDays = absenceDaysCol?.let { getCellDouble(row.getCell(it)).toInt() } ?: 0
                val absenceDed = absenceDedCol?.let { getCellDouble(row.getCell(it)) } ?: 0.0
                val searchFee = searchFeeCol?.let { getCellDouble(row.getCell(it)).takeIf { v -> v > 0.0 } }
                
                val rawForeign = foreignCol?.let { getCellString(row.getCell(it)).lowercase() } ?: ""
                val isForeign = rawForeign in listOf("true", "yes", "foreign", "1", "y") || (currencyCol?.let { getCellString(row.getCell(it)).equals("usd", ignoreCase = true) } == true)
                val currency = currencyCol?.let { getCellString(row.getCell(it)).ifBlank { null } } ?: (if (isForeign) "USD" else "Dinar")
                val recruitmentFee = recruitmentCol?.let { getCellDouble(row.getCell(it)).takeIf { v -> v > 0.0 } }
                val hasRecruitment = recruitmentFee != null && recruitmentFee > 0.0

                val email = emailCol?.let { getCellString(row.getCell(it)) } ?: ""
                val phone = phoneCol?.let { getCellString(row.getCell(it)) } ?: ""

                parsedList.add(
                    CreateEmployeeRequest(
                        periodId = periodId,
                        name = rawName,
                        department = dept,
                        type = empType,
                        baseSalary = baseSalary,
                        bonus = bonus,
                        insurance = insurance,
                        absenceDays = absenceDays,
                        absenceDeduction = absenceDed,
                        searchingDocFee = searchFee,
                        isForeign = isForeign,
                        currency = currency,
                        hasRecruitmentFee = hasRecruitment,
                        recruitmentFee = recruitmentFee,
                        email = email,
                        phone = phone
                    )
                )
            } catch (e: Exception) {
                errorList.add("Row ${rowIdx + 1} ($rawName): ${e.message}")
            }
        }

        workbook.close()
        return ExcelParseResult(
            employees = parsedList,
            errors = errorList,
            totalRowsProcessed = processedCount
        )
    }

    private fun getCellString(cell: Cell?): String {
        if (cell == null) return ""
        return when (cell.cellType) {
            CellType.STRING -> cell.stringCellValue.trim()
            CellType.NUMERIC -> {
                val num = cell.numericCellValue
                if (num == num.toLong().toDouble()) num.toLong().toString() else num.toString()
            }
            CellType.BOOLEAN -> cell.booleanCellValue.toString()
            CellType.FORMULA -> {
                try {
                    cell.stringCellValue.trim()
                } catch (e: Exception) {
                    cell.numericCellValue.toString()
                }
            }
            else -> ""
        }
    }

    private fun getCellDouble(cell: Cell?): Double {
        if (cell == null) return 0.0
        return when (cell.cellType) {
            CellType.NUMERIC -> cell.numericCellValue
            CellType.STRING -> {
                val clean = cell.stringCellValue
                    .replace(",", "")
                    .replace("$", "")
                    .replace("IQD", "", ignoreCase = true)
                    .replace("USD", "", ignoreCase = true)
                    .trim()
                clean.toDoubleOrNull() ?: 0.0
            }
            CellType.FORMULA -> {
                try {
                    cell.numericCellValue
                } catch (e: Exception) {
                    0.0
                }
            }
            else -> 0.0
        }
    }
}
