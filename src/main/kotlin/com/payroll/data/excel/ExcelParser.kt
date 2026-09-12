package com.payroll.data.excel

import com.payroll.domain.models.CreateEmployeeRequest
import org.apache.poi.ss.usermodel.*
import java.io.InputStream
import java.text.SimpleDateFormat
import java.util.Locale

data class ExcelParseResult(
    val employees: List<CreateEmployeeRequest>,
    val errors: List<String>,
    val totalRowsProcessed: Int
)

class ExcelParser {

    /**
     * Parses an Excel input stream (.xlsx or .xls) into a list of [CreateEmployeeRequest] objects.
     */
    fun parse(inputStream: InputStream, periodId: String): ExcelParseResult {
        val workbook = WorkbookFactory.create(inputStream)
        val sheet = workbook.getSheetAt(0) ?: error("Excel workbook contains no sheets")
        val evaluator = try { workbook.creationHelper.createFormulaEvaluator() } catch (_: Exception) { null }

        // Find the header row (scan rows 0..4 in case row 0 is empty or title)
        var headerRowIndex = 0
        var headerRow: Row? = null
        val headerMap = mutableMapOf<String, Int>()       // normalizedKey -> columnIndex
        val rawHeaderMap = mutableMapOf<String, Int>()    // lowercase raw -> columnIndex

        for (r in 0..minOf(5, sheet.lastRowNum)) {
            val candidate = sheet.getRow(r) ?: continue
            val tempMap = mutableMapOf<String, Int>()
            val tempRaw = mutableMapOf<String, Int>()
            for (cell in candidate) {
                val raw = getCellString(cell, evaluator).trim()
                if (raw.isNotBlank()) {
                    val norm = normalizeKey(raw)
                    if (norm.isNotBlank() && !tempMap.containsKey(norm)) {
                        tempMap[norm] = cell.columnIndex
                    }
                    val lower = raw.lowercase()
                    if (!tempRaw.containsKey(lower)) {
                        tempRaw[lower] = cell.columnIndex
                    }
                }
            }
            // Check if this row looks like a header row (contains at least name, salary, etc.)
            val hasHeaderHints = tempMap.keys.any { key ->
                key in listOf("name", "employeename", "fullname", "basesalary", "salary", "الاسم", "اسمالموظف", "الراتبالاسمي", "department", "قسم")
            }
            if (hasHeaderHints || (candidate.physicalNumberOfCells >= 3 && headerRow == null)) {
                headerRow = candidate
                headerRowIndex = r
                headerMap.clear()
                headerMap.putAll(tempMap)
                rawHeaderMap.clear()
                rawHeaderMap.putAll(tempRaw)
                if (hasHeaderHints) break
            }
        }

        if (headerRow == null) {
            workbook.close()
            error("Excel sheet is empty: missing header row")
        }

        fun findColumn(vararg aliases: String): Int? {
            // 1. Direct match on normalized alias (strips spaces, underscores, hyphens, punctuation)
            for (alias in aliases) {
                val norm = normalizeKey(alias)
                headerMap[norm]?.let { return it }
            }
            // 2. Direct match on raw lowercase trimmed alias
            for (alias in aliases) {
                val lower = alias.trim().lowercase()
                rawHeaderMap[lower]?.let { return it }
            }
            // 3. Substring match (e.g., alias "basesalary" inside "basesalaryiqd" or vice versa)
            for (alias in aliases) {
                val norm = normalizeKey(alias)
                if (norm.length >= 4) {
                    for ((headerNorm, idx) in headerMap) {
                        if (headerNorm.contains(norm) || norm.contains(headerNorm)) {
                            return idx
                        }
                    }
                }
            }
            return null
        }

        // Column mappings with comprehensive English (camelCase, snake_case, spaced) and Arabic aliases
        val idCol = findColumn(
            "id", "empid", "emp_id", "employeeid", "employee_id", "code", "employeecode",
            "staffid", "كود", "رقم_الموظف", "الرقم_الوظيفي", "معرف_الموظف", "المعرف"
        )
        val nameCol = findColumn(
            "name", "employee name", "employeename", "employee_name", "fullname", "full name",
            "employee", "staff name", "worker name", "الاسم", "اسم_الموظف", "اسم الموظف", "الاسم الكامل", "الاسم_الكامل"
        ) ?: 0
        val deptCol = findColumn(
            "department", "dept", "division", "unit", "section", "team", "branch",
            "القسم", "الدائرة", "الشعبة", "الوحدة", "الفرع", "الادارة"
        )
        val typeCol = findColumn(
            "type", "employment type", "employmenttype", "employment_type", "contract type", "contracttype",
            "contract", "job type", "workertype", "نوع التعيين", "نوع_التعيين", "الصفة", "نوع العقد", "نوع_العقد", "حالة الدوام"
        )
        val baseSalaryCol = findColumn(
            "baseSalary", "basesalary", "base salary", "base_salary", "basic salary", "basicsalary",
            "basic_salary", "salary", "base pay", "basepay", "net base",
            "الراتب الاسمي", "الراتب_الاسمي", "الاسمي", "راتب اسمي", "الراتب الأساسي", "الراتب_الأساسي", "الاساسي"
        )
        val bonusCol = findColumn(
            "bonus", "bonuses", "allowance", "allowances", "incentive", "incentives", "addition", "additions",
            "المخصصات", "مخصصات", "العلاوات", "علاوات", "مكافأة", "حوافز"
        )
        val insuranceCol = findColumn(
            "insurance", "health insurance", "social security", "pension", "retirement",
            "التقاعد", "الضمان", "الضمان الاجتماعي", "التأمين", "استقطاع التقاعد"
        )
        val absenceDaysCol = findColumn(
            "absenceDays", "absencedays", "absence days", "absence_days", "absences", "absence count",
            "absence", "days absent", "unpaid days",
            "ايام الغياب", "أيام الغياب", "ايام_الغياب", "أيام_الغياب", "الغياب", "عدد ايام الغياب"
        )
        val absenceDedCol = findColumn(
            "absenceDeduction", "absencededuction", "absence deduction", "absence_deduction",
            "absence fee", "absence penalty", "absence amount", "absence ded",
            "استقطاع الغياب", "استقطاع_الغياب", "خصم الغياب", "مبلغ الغياب"
        )
        val searchFeeCol = findColumn(
            "searchingDocFee", "searchingdocfee", "searching doc fee", "searching_doc_fee",
            "search fee", "searchfee", "searching fee", "doc fee", "search", "search doc fee",
            "رسم البحث", "رسم_البحث", "اجور البحث", "رسوم تدقيق"
        )
        val foreignCol = findColumn(
            "isForeign", "isforeign", "is foreign", "is_foreign", "foreign", "nationality",
            "citizenship", "alien", "expat", "اجنبي", "أجنبي", "وافد", "الجنسية"
        )
        val currencyCol = findColumn("currency", "curr", "العملة", "عملة")
        val recruitmentCol = findColumn(
            "recruitmentFee", "recruitmentfee", "recruitment fee", "recruitment_fee",
            "recruitment", "hiring fee", "hiring_fee", "رسم التوظيف", "رسم_التوظيف", "اجور التوظيف", "رسوم التعيين"
        )
        val emailCol = findColumn("email", "e-mail", "mail", "email address", "البريد الالكتروني", "البريد")
        val phoneCol = findColumn("phone", "mobile", "telephone", "contact", "phone number", "mobile number", "رقم الهاتف", "الهاتف", "الموبايل")
        val salaryStateCol = findColumn("salaryState", "salarystate", "salary state", "paymentStatus", "paymentstatus", "payment status", "status", "حالة الصرف", "حالة الدفع")
        val joinDateCol = findColumn("joinDate", "joindate", "join date", "hire date", "start date", "تاريخ المباشرة", "تاريخ التعيين")
        val initialsCol = findColumn("initials", "الأحرف الأولى")

        val parsedList = mutableListOf<CreateEmployeeRequest>()
        val errorList = mutableListOf<String>()
        var processedCount = 0

        for (rowIdx in (headerRowIndex + 1)..sheet.lastRowNum) {
            val row = sheet.getRow(rowIdx) ?: continue
            val rawName = getCellString(row.getCell(nameCol), evaluator).trim()

            if (rawName.isBlank()) continue // skip empty rows
            processedCount++

            try {
                val rawId = idCol?.let { getCellString(row.getCell(it), evaluator).trim() }
                val empId = rawId?.takeIf { it.isNotBlank() }

                val dept = deptCol?.let { getCellString(row.getCell(it), evaluator).trim().ifBlank { null } } ?: "Operations"
                val empType = typeCol?.let { getCellString(row.getCell(it), evaluator).trim().ifBlank { null } } ?: "Full-Time"
                val baseSalary = baseSalaryCol?.let { getCellDouble(row.getCell(it), evaluator) } ?: 0.0
                val bonus = bonusCol?.let { getCellDouble(row.getCell(it), evaluator) } ?: 0.0
                val insurance = insuranceCol?.let { getCellDouble(row.getCell(it), evaluator) } ?: 0.0
                val absenceDays = absenceDaysCol?.let { getCellInt(row.getCell(it), evaluator) } ?: 0
                val rawAbsenceDed = absenceDedCol?.let { getCellDouble(row.getCell(it), evaluator) } ?: 0.0
                val absenceDed = if (rawAbsenceDed > 0.0) {
                    rawAbsenceDed
                } else if (absenceDays > 0 && baseSalary > 0.0) {
                    // Standard daily rate calculation: (baseSalary / 30.0) * absenceDays
                    Math.round((baseSalary / 30.0 * absenceDays) * 100.0) / 100.0
                } else {
                    0.0
                }
                val searchFee = searchFeeCol?.let { getCellDouble(row.getCell(it), evaluator).takeIf { v -> v > 0.0 } }

                val rawForeign = foreignCol?.let { getCellString(row.getCell(it), evaluator).trim().lowercase() } ?: ""
                val isForeign = rawForeign in listOf("true", "yes", "foreign", "1", "y", "نعم", "اجنبي", "أجنبي") ||
                        (currencyCol?.let { getCellString(row.getCell(it), evaluator).trim().equals("usd", ignoreCase = true) } == true)
                val rawCurrency = currencyCol?.let { getCellString(row.getCell(it), evaluator).trim().ifBlank { null } }
                val currency = rawCurrency ?: (if (isForeign) "USD" else "IQD")

                val recruitmentFee = recruitmentCol?.let { getCellDouble(row.getCell(it), evaluator).takeIf { v -> v > 0.0 } }
                val hasRecruitment = recruitmentFee != null && recruitmentFee > 0.0

                val email = emailCol?.let { getCellString(row.getCell(it), evaluator).trim() } ?: ""
                val phone = phoneCol?.let { getCellString(row.getCell(it), evaluator).trim() } ?: ""

                val rawSalaryState = salaryStateCol?.let { getCellString(row.getCell(it), evaluator).trim() }
                val salaryState = when (rawSalaryState?.lowercase()) {
                    "paid", "مدفوع", "تم الصرف" -> "Paid"
                    "stopped", "موقوف" -> "Stopped"
                    else -> "Not Yet"
                }
                val joinDate = joinDateCol?.let { getCellString(row.getCell(it), evaluator).trim().ifBlank { null } }
                val initials = initialsCol?.let { getCellString(row.getCell(it), evaluator).trim().ifBlank { null } }

                parsedList.add(
                    CreateEmployeeRequest(
                        id = empId,
                        periodId = periodId,
                        name = rawName,
                        initials = initials,
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
                        salaryState = salaryState,
                        joinDate = joinDate,
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

    private fun normalizeKey(key: String): String {
        return key.lowercase()
            .replace("[^a-z0-9\u0600-\u06FF]".toRegex(), "") // keep alphanumeric and Arabic characters
            .trim()
    }

    private fun getCellString(cell: Cell?, evaluator: FormulaEvaluator?): String {
        if (cell == null) return ""
        return when (cell.cellType) {
            CellType.STRING -> cell.stringCellValue.trim()
            CellType.NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    try {
                        cell.localDateTimeCellValue?.toLocalDate()?.toString()
                            ?: SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cell.dateCellValue)
                    } catch (_: Exception) {
                        val num = cell.numericCellValue
                        if (num == num.toLong().toDouble()) num.toLong().toString() else num.toString()
                    }
                } else {
                    val num = cell.numericCellValue
                    if (num == num.toLong().toDouble()) num.toLong().toString() else num.toString()
                }
            }
            CellType.BOOLEAN -> cell.booleanCellValue.toString()
            CellType.FORMULA -> {
                try {
                    val cellValue = try { evaluator?.evaluate(cell) } catch (_: Exception) { null }
                    if (cellValue != null) {
                        when (cellValue.cellType) {
                            CellType.STRING -> cellValue.stringValue.trim()
                            CellType.NUMERIC -> {
                                val num = cellValue.numberValue
                                if (num == num.toLong().toDouble()) num.toLong().toString() else num.toString()
                            }
                            CellType.BOOLEAN -> cellValue.booleanValue.toString()
                            else -> ""
                        }
                    } else {
                        when (cell.cachedFormulaResultType) {
                            CellType.STRING -> cell.stringCellValue.trim()
                            CellType.NUMERIC -> {
                                val num = cell.numericCellValue
                                if (num == num.toLong().toDouble()) num.toLong().toString() else num.toString()
                            }
                            CellType.BOOLEAN -> cell.booleanCellValue.toString()
                            else -> cell.stringCellValue.trim()
                        }
                    }
                } catch (_: Exception) {
                    ""
                }
            }
            else -> ""
        }
    }

    private fun getCellDouble(cell: Cell?, evaluator: FormulaEvaluator?): Double {
        if (cell == null) return 0.0
        return when (cell.cellType) {
            CellType.NUMERIC -> cell.numericCellValue
            CellType.STRING -> cleanDouble(cell.stringCellValue)
            CellType.BOOLEAN -> if (cell.booleanCellValue) 1.0 else 0.0
            CellType.FORMULA -> {
                try {
                    val cellValue = try { evaluator?.evaluate(cell) } catch (_: Exception) { null }
                    if (cellValue != null) {
                        when (cellValue.cellType) {
                            CellType.NUMERIC -> cellValue.numberValue
                            CellType.STRING -> cleanDouble(cellValue.stringValue)
                            CellType.BOOLEAN -> if (cellValue.booleanValue) 1.0 else 0.0
                            else -> 0.0
                        }
                    } else {
                        when (cell.cachedFormulaResultType) {
                            CellType.NUMERIC -> cell.numericCellValue
                            CellType.STRING -> cleanDouble(cell.stringCellValue)
                            CellType.BOOLEAN -> if (cell.booleanCellValue) 1.0 else 0.0
                            else -> {
                                try {
                                    cell.numericCellValue
                                } catch (_: Exception) {
                                    cleanDouble(cell.stringCellValue)
                                }
                            }
                        }
                    }
                } catch (_: Exception) {
                    0.0
                }
            }
            else -> 0.0
        }
    }

    private fun getCellInt(cell: Cell?, evaluator: FormulaEvaluator?): Int {
        val d = getCellDouble(cell, evaluator)
        return d.toInt()
    }

    private fun cleanDouble(text: String): Double {
        if (text.isBlank()) return 0.0

        // Convert Eastern Arabic numerals (٠-٩) to Latin (0-9)
        val sb = StringBuilder()
        for (ch in text) {
            when (ch) {
                in '٠'..'٩' -> sb.append(ch - '٠')
                in '۰'..'۹' -> sb.append(ch - '۰')
                else -> sb.append(ch)
            }
        }
        var s = sb.toString().trim()

        // Strip currency symbols and letters
        s = s.replace("$", "")
            .replace("IQD", "", ignoreCase = true)
            .replace("USD", "", ignoreCase = true)
            .replace("د.ع", "")
            .replace("دنانير", "")
            .replace("دينار", "")
            .trim()

        // Handle negative numbers with parentheses: (100.00) -> -100.00
        val isNegative = s.startsWith("-") || (s.startsWith("(") && s.endsWith(")"))
        s = s.replace("(", "").replace(")", "").replace("-", "").trim()

        // Remove thousands separators: commas or spaces
        // If format is 1,234.56 -> remove comma
        // If format is 1.234,56 (European) -> replace comma with dot
        s = if (s.contains(",") && s.contains(".")) {
            if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
                s.replace(".", "").replace(",", ".")
            } else {
                s.replace(",", "")
            }
        } else if (s.contains(",")) {
            val parts = s.split(",")
            if (parts.size == 2 && parts[1].length != 3) {
                s.replace(",", ".")
            } else {
                s.replace(",", "")
            }
        } else {
            s.replace(" ", "")
        }

        val parsed = s.toDoubleOrNull() ?: 0.0
        return if (isNegative) -parsed else parsed
    }
}
