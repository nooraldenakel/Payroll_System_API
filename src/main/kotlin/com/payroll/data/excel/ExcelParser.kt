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
        if (workbook.numberOfSheets == 0) {
            workbook.close()
            error("Excel workbook contains no sheets")
        }
        val evaluator = try { workbook.creationHelper.createFormulaEvaluator() } catch (_: Exception) { null }

        val parsedList = mutableListOf<CreateEmployeeRequest>()
        val errorList = mutableListOf<String>()
        val assignedIds = mutableSetOf<String>()
        var processedCount = 0

        for (sheetIdx in 0 until workbook.numberOfSheets) {
            val sheet = workbook.getSheetAt(sheetIdx) ?: continue
            if (sheet.physicalNumberOfRows < 1) continue
            val sheetDepartmentFallback = sheet.sheetName.trim().ifBlank { "Presidency" }

            // Find the best header row (scan rows 0..min(10, sheet.lastRowNum) by scoring matched keywords)
            var headerRowIndex = 0
            var headerRow: Row? = null
            val headerMap = mutableMapOf<String, Int>()       // normalizedKey -> columnIndex
            val rawHeaderMap = mutableMapOf<String, Int>()    // lowercase raw -> columnIndex

            val candidateKeywords = listOf(
                "name", "fullname", "basesalary", "salary", "net", "bonus", "insurance", "department",
                "الاسم", "اسمالموظف", "الراتب", "الراتبالاسمي", "المخصصات", "الضمان", "التقاعد", "القسم",
                "تسلسل", "ت", "الرقم", "الصافي", "بحث", "حضور", "غياب", "العنوان", "المنصب"
            )

            var bestScore = -1
            for (r in 0..minOf(10, sheet.lastRowNum)) {
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

                var score = 0
                for (key in tempMap.keys) {
                    if (candidateKeywords.any { key.contains(it) || it.contains(key) }) {
                        score++
                    }
                }

                if (score > bestScore) {
                    bestScore = score
                    headerRow = candidate
                    headerRowIndex = r
                    headerMap.clear()
                    headerMap.putAll(tempMap)
                    rawHeaderMap.clear()
                    rawHeaderMap.putAll(tempRaw)
                }
            }

            if (headerRow == null || bestScore <= 0) {
                // If this sheet has no recognizable header, skip to next sheet
                continue
            }

            val sequenceHeaders = setOf("ت", "تسلسل", "الرقم", "رقم", "م", "no", "seq", "sequence", "#")

            fun findColumn(vararg aliases: String): Int? {
                for (alias in aliases) {
                    val norm = normalizeKey(alias)
                    headerMap[norm]?.let { return it }
                }
                for (alias in aliases) {
                    val lower = alias.trim().lowercase()
                    rawHeaderMap[lower]?.let { return it }
                }
                for (alias in aliases) {
                    val norm = normalizeKey(alias)
                    if (norm.length >= 3) {
                        for ((headerNorm, idx) in headerMap) {
                            if (headerNorm.length >= 3 && !sequenceHeaders.contains(headerNorm) &&
                                (headerNorm.contains(norm) || norm.contains(headerNorm))) {
                                return idx
                            }
                        }
                    }
                }
                return null
            }

            // Column mappings: ONLY match real employee code/ID columns, NOT row sequence numbers ("ت", "تسلسل")
            val idCol = findColumn(
                "id", "empid", "emp_id", "employeeid", "employee_id", "code", "employeecode",
                "staffid", "كود", "كود_الموظف", "رقم_الموظف", "الرقم_الوظيفي", "معرف_الموظف", "المعرف"
            )
            val nameCol = findColumn(
                "name", "employee name", "employeename", "employee_name", "fullname", "full name",
                "employee", "staff name", "worker name", "الاسم", "اسم_الموظف", "اسم الموظف", "الاسم الكامل", "الاسم_الكامل",
                "الاسم الثلاثي واللقب العلمي", "اسم التدريسي", "اسم الاستاذ", "الاسم واللقب", "اسم المنتسب", "التدريسي", "الاستاذ", "الموظف",
                "الاسم الثلاثي", "الاسم الرباعي", "اسماء الموظفين"
            )

            if (nameCol == null) {
                // If sheet doesn't contain a name column, continue
                continue
            }

            val deptCol = findColumn("department", "dept", "division", "unit", "section", "faculty", "college", "القسم", "الدائرة", "الكلية", "الجهة", "الفرع", "الوحدة", "الشعبة", "كلية", "قسم")
            val typeCol = findColumn("type", "employmenttype", "employment_type", "employment type", "contract", "نوع التعيين", "الصفة", "نوع العقد", "العنوان الوظيفي", "المنصب", "الوظيفة", "اللقب العلمي", "اللقب", "المرتبة")
            val baseSalaryCol = findColumn(
                "basesalary", "base_salary", "base salary", "basicsalary", "basic salary",
                "salary", "base pay", "net base", "الراتب الاسمي", "الراتب_الاسمي", "الاسمي", "الراتب الشهري (الاسمي)", "الراتب الشهري", "الراتب الكلي", "الراتب", "راتب", "المجموع", "الاساسي"
            )
            val bonusCol = findColumn(
                "bonus", "bonuses", "allowance", "allowances", "incentive",
                "المخصصات", "مخصصات", "مخصصات هندسية", "مخصصات منصب", "علاوة", "علاوات", "مكافأة", "مكافاة", "حوافز", "البدلات", "بدلات", "اجور اضافية", "مخصصات الشهادة"
            )
            val arrivalFeeCol = findColumn(
                "arrival", "arrivalfee", "arrival fee", "0.05", "اجور الحضور", "اجور الحضور (0.05)", "حضور", "رسم الحضور", "نسبة الحضور"
            )
            val insuranceCol = findColumn(
                "insurance", "health insurance", "social security", "pension",
                "التقاعد", "الضمان", "التأمين", "استقطاع التقاعد", "صندوق التقاعد", "التوقيفات التقاعدية", "التامين", "التامين الصحي", "الضمان الصحي", "الضمان الاجتماعي", "تقاعد", "ضمان"
            )
            val absenceDaysCol = findColumn(
                "absencedays", "absence_days", "absence days", "absences", "absence count",
                "ايام الغياب", "ايام_الغياب", "عدد ايام الغياب", "الغياب", "غياب", "عدد الغيابات", "الغيابات", "يوم غياب"
            )
            val absenceDedCol = findColumn(
                "absencededuction", "absence_deduction", "absence deduction", "deductions", "deduction",
                "absence fee", "absence penalty", "absence amount", "absence ded",
                "استقطاع الغياب", "استقطاع_الغياب", "خصم الغياب", "مبلغ الغياب", "الغيابات والاستقطاعات", "استقطاعات الغياب"
            )
            val searchFeeCol = findColumn(
                "searchingDocFee", "searchingdocfee", "searching doc fee", "searching_doc_fee",
                "search fee", "searchfee", "searching fee", "doc fee", "search", "search doc fee",
                "رسم البحث", "رسم_البحث", "اجور البحث", "رسوم تدقيق", "اجور البحث العلمي", "تدقيق", "اجور التدقيق", "رسوم التدقيق", "بحوث"
            )
            val foreignCol = findColumn(
                "isForeign", "isforeign", "is foreign", "is_foreign", "foreign", "nationality",
                "citizenship", "alien", "expat", "اجنبي", "أجنبي", "وافد"
            )
            val currencyCol = findColumn("currency", "curr", "العملة", "عملة", "نوع العملة")
            val recruitmentCol = findColumn(
                "recruitmentFee", "recruitmentfee", "recruitment fee", "recruitment_fee",
                "recruitment", "hiring fee", "hiring_fee", "رسم التوظيف", "رسم_التوظيف", "اجور التوظيف", "رسوم التعيين"
            )
            val emailCol = findColumn("email", "e-mail", "mail", "email address", "البريد الالكتروني", "البريد")
            val phoneCol = findColumn("phone", "mobile", "telephone", "contact", "phone number", "mobile number", "رقم الهاتف", "الهاتف", "الموبايل")
            val salaryStateCol = findColumn("salaryState", "salarystate", "salary state", "paymentStatus", "paymentstatus", "payment status", "status", "حالة الصرف", "حالة الدفع", "الاستلام", "التوقيع")
            val joinDateCol = findColumn("joinDate", "joindate", "join date", "hire date", "start date", "تاريخ المباشرة", "تاريخ التعيين")
            val initialsCol = findColumn("initials", "الأحرف الأولى")

            val cleanSheet = sheet.sheetName.trim().replace("\\s+".toRegex(), "_")

            for (rowIdx in (headerRowIndex + 1)..sheet.lastRowNum) {
                val row = sheet.getRow(rowIdx) ?: continue
                val rawName = getCellString(row.getCell(nameCol), evaluator).trim()

                if (rawName.isBlank()) continue // skip empty rows
                if (isIgnoredHeaderOrSummary(rawName)) continue // skip repeated sub-headers and summary/total rows
                processedCount++

                try {
                    val rawId = idCol?.let { getCellString(row.getCell(it), evaluator).trim() }
                    // Generate clean numeric ID without Arabic department suffixes
                    val candidateId = if (!rawId.isNullOrBlank() && !isIgnoredHeaderOrSummary(rawId)) {
                        if (rawId.all { it.isDigit() }) {
                            "EMP-${rawId.padStart(4, '0')}"
                        } else if (!rawId.contains("-") && !rawId.contains("_")) {
                            "EMP-$rawId"
                        } else {
                            rawId
                        }
                    } else {
                        "EMP-${processedCount.toString().padStart(4, '0')}"
                    }

                    // Guarantee absolute uniqueness across the entire workbook
                    var empId = candidateId
                    var counter = 2
                    while (assignedIds.contains(empId.lowercase())) {
                        empId = "${candidateId}_$counter"
                        counter++
                    }
                    assignedIds.add(empId.lowercase())

                    val dept = deptCol?.let { getCellString(row.getCell(it), evaluator).trim().ifBlank { null } }
                        ?: sheetDepartmentFallback
                    val empType = typeCol?.let { getCellString(row.getCell(it), evaluator).trim().ifBlank { null } } ?: "Full-Time"

                    val rawBaseSalaryCell = baseSalaryCol?.let { row.getCell(it) }
                    val rawBaseSalaryStr = getCellString(rawBaseSalaryCell, evaluator).trim()
                    val formatString = rawBaseSalaryCell?.cellStyle?.dataFormatString ?: ""
                    val hasDollarInBase = rawBaseSalaryStr.contains("$") || formatString.contains("$")

                    val rawForeign = foreignCol?.let { getCellString(row.getCell(it), evaluator).trim().lowercase() } ?: ""
                    val isForeign = hasDollarInBase ||
                            rawForeign in listOf("true", "yes", "foreign", "1", "y", "نعم", "اجنبي", "أجنبي") ||
                            (currencyCol?.let { getCellString(row.getCell(it), evaluator).trim().equals("usd", ignoreCase = true) } == true)

                    val rawCurrency = currencyCol?.let { getCellString(row.getCell(it), evaluator).trim().ifBlank { null } }
                    val currency = if (isForeign) "USD" else (rawCurrency ?: "IQD")

                    // Number scaling rule: if local employee (not foreign/USD) and value < 1000 and > 0, multiply by 1000
                    fun scaleLocalNumber(num: Double): Double {
                        return if (!isForeign && num > 0.0 && num < 1000.0) num * 1000.0 else num
                    }

                    val rawBaseSalary = baseSalaryCol?.let { getCellDouble(row.getCell(it), evaluator) } ?: 0.0
                    // User rule: all baseSalary that don't have dollar sign less then 100,000 should mul it with 1,000
                    val baseSalary = if (!hasDollarInBase && !isForeign && rawBaseSalary > 0.0 && rawBaseSalary < 100000.0) {
                        rawBaseSalary * 1000.0
                    } else {
                        rawBaseSalary
                    }

                    val rawBonus = bonusCol?.let { getCellDouble(row.getCell(it), evaluator) } ?: 0.0
                    val bonus = scaleLocalNumber(rawBonus)

                    val rawInsurance = insuranceCol?.let { getCellDouble(row.getCell(it), evaluator) } ?: 0.0
                    val insurance = if (isForeign) rawInsurance else scaleLocalNumber(rawInsurance)

                    // Absence days count is preserved as an integer (e.g. 1, 2, 3 days), never multiplied by 1000
                    val absenceDays = absenceDaysCol?.let { getCellInt(row.getCell(it), evaluator) } ?: 0
                    val rawAbsenceDed = if (absenceDedCol != null && absenceDedCol != absenceDaysCol) {
                        getCellDouble(row.getCell(absenceDedCol), evaluator)
                    } else {
                        0.0
                    }
                    val calculatedAbsenceDed = if (rawAbsenceDed > 0.0) {
                        if (isForeign) rawAbsenceDed else scaleLocalNumber(rawAbsenceDed)
                    } else if (absenceDays > 0 && baseSalary > 0.0) {
                        Math.round((baseSalary / 30.0 * absenceDays) * 100.0) / 100.0
                    } else {
                        0.0
                    }
                    val absenceDed = calculatedAbsenceDed

                    val rawSearchFee = searchFeeCol?.let { getCellDouble(row.getCell(it), evaluator).takeIf { v -> v > 0.0 } }
                    val searchFee = if (isForeign) rawSearchFee else rawSearchFee?.let { scaleLocalNumber(it) }

                    // Arrival fee rule: ONLY enabled if Base Salary has "$" dollar sign. Otherwise disabled (0.0).
                    val rawArrivalFee = arrivalFeeCol?.let { getCellDouble(row.getCell(it), evaluator).takeIf { v -> v > 0.0 } }
                        ?: recruitmentCol?.let { getCellDouble(row.getCell(it), evaluator).takeIf { v -> v > 0.0 } }
                    val recruitmentFee = if (hasDollarInBase) {
                        Math.round(baseSalary * 0.05 * 100.0) / 100.0
                    } else if (isForeign && rawArrivalFee != null && rawArrivalFee > 0.0) {
                        rawArrivalFee
                    } else {
                        null
                    }
                    val hasRecruitment = recruitmentFee != null && recruitmentFee > 0.0

                    val email = emailCol?.let { getCellString(row.getCell(it), evaluator).trim() } ?: ""
                    val phone = phoneCol?.let { getCellString(row.getCell(it), evaluator).trim() } ?: ""

                    val rawSalaryState = salaryStateCol?.let { getCellString(row.getCell(it), evaluator).trim() }
                    val salaryState = if (baseSalary <= 0.0) {
                        "Stopped"
                    } else when (rawSalaryState?.lowercase()) {
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
                    errorList.add("Sheet '${sheet.sheetName}', Row ${rowIdx + 1} ($rawName): ${e.message}")
                }
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
            .replace("[\\u064B-\\u0652\\u0640]".toRegex(), "") // strip Arabic diacritics (tashkeel) & tatweel
            .replace("[أإآ]".toRegex(), "ا") // normalize Alef variations
            .replace("ة".toRegex(), "ه")     // normalize Taa Marbuta to Haa
            .replace("ى".toRegex(), "ي")     // normalize Alef Maksura to Yaa
            .replace("[^a-z0-9\\u0600-\\u06FF]".toRegex(), "") // keep alphanumeric and Arabic characters
            .trim()
    }

    private val ignoredRowNames = setOf(
        "الاسم", "الاسمالرباعي", "الاسمالثلاثي", "اسمالموظف", "الاسمالكامل",
        "الاسمالتدريسي", "اسمالتدريسي", "الاسماء", "اسماءالموظفين", "اسمالمنتسب",
        "المجموع", "المجموعالكلي", "الاجمالي", "الاجماليكلي", "اجمالي", "اجماليلرواتب", "اجماليرواتب",
        "total", "grandtotal", "sum", "name", "fullname", "employeename", "staffname",
        "ت", "تسلسل", "الرقم"
    )

    private fun isIgnoredHeaderOrSummary(text: String): Boolean {
        val norm = normalizeKey(text)
        if (norm.isBlank()) return true
        if (ignoredRowNames.contains(norm)) return true
        if (norm.contains("المجموع") || norm.contains("الاجمالي") || norm.contains("اجمالي")) return true
        if (norm == "الاسم" || norm.startsWith("الاسمالتدريسي") || norm.startsWith("اسمالموظف")) return true
        return false
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
