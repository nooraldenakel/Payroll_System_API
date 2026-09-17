package com.payroll

import com.payroll.data.excel.ExcelParser
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

class ExcelParserTest {

    @Test
    fun testParseExcelWithCamelCaseHeadersAndFormattedNumbers() {
        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("Employees")

        // Create Header Row (exactly matching user's Excel headers)
        val headerRow = sheet.createRow(0)
        val headers = listOf(
            "name", "department", "type", "baseSalary", "bonus", "insurance",
            "absenceDays", "absenceDeduction", "searchingDocFee", "isForeign",
            "currency", "email", "phone"
        )
        headers.forEachIndexed { idx, h ->
            headerRow.createCell(idx).setCellValue(h)
        }

        // Row 1: Hussein Al-Shammari with formatted string/numeric values
        val row1 = sheet.createRow(1)
        row1.createCell(0).setCellValue("Hussein Al-Shammari")
        row1.createCell(1).setCellValue("Maintenance")
        row1.createCell(2).setCellValue("Part-time")
        row1.createCell(3).setCellValue("886,000.00") // String with comma
        row1.createCell(4).setCellValue(45900.0)      // Numeric
        row1.createCell(5).setCellValue("29,800.00")  // String with comma
        row1.createCell(6).setCellValue(1.0)          // Numeric absenceDays
        row1.createCell(7).setCellValue("29,533.33")  // String absenceDeduction
        row1.createCell(8).setCellValue("25,000.00")  // String searchingDocFee
        row1.createCell(9).setCellValue(false)        // Boolean isForeign
        row1.createCell(10).setCellValue("IQD")
        row1.createCell(11).setCellValue("hussein.alshammari@example.com")
        row1.createCell(12).setCellValue("+964 780 139 2776")

        val out = ByteArrayOutputStream()
        workbook.write(out)
        workbook.close()

        val parser = ExcelParser()
        val result = parser.parse(ByteArrayInputStream(out.toByteArray()), "PR-2610")

        assertEquals(0, result.errors.size)
        assertEquals(1, result.employees.size)

        val emp = result.employees[0]
        assertEquals("Hussein Al-Shammari", emp.name)
        assertEquals("Maintenance", emp.department)
        assertEquals("Part-time", emp.type)
        assertEquals(886000.0, emp.baseSalary, 0.01)
        assertEquals(45900.0, emp.bonus, 0.01)
        assertEquals(29800.0, emp.insurance, 0.01)
        assertEquals(1, emp.absenceDays)
        assertEquals(29533.33, emp.absenceDeduction, 0.01)
        assertNotNull(emp.searchingDocFee)
        assertEquals(25000.0, emp.searchingDocFee!!, 0.01)
        assertFalse(emp.isForeign)
        assertEquals("IQD", emp.currency)
        assertEquals("hussein.alshammari@example.com", emp.email)
        assertEquals("+964 780 139 2776", emp.phone)
    }

    @Test
    fun testAbsenceDeductionAutoCalculationWhenMissing() {
        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("Employees")

        // Headers without explicit absenceDeduction
        val headerRow = sheet.createRow(0)
        listOf("name", "base_salary", "absence_days").forEachIndexed { idx, h ->
            headerRow.createCell(idx).setCellValue(h)
        }

        // 900,000 base salary and 2 absence days -> 900,000 / 30 * 2 = 60,000
        val row = sheet.createRow(1)
        row.createCell(0).setCellValue("Ali Hassan")
        row.createCell(1).setCellValue(900000.0)
        row.createCell(2).setCellValue(2.0)

        val out = ByteArrayOutputStream()
        workbook.write(out)
        workbook.close()

        val parser = ExcelParser()
        val result = parser.parse(ByteArrayInputStream(out.toByteArray()), "PR-2610")

        assertEquals(1, result.employees.size)
        val emp = result.employees[0]
        assertEquals(900000.0, emp.baseSalary, 0.01)
        assertEquals(2, emp.absenceDays)
        assertEquals(60000.0, emp.absenceDeduction, 0.01)
    }

    @Test
    fun testArabicHeadersSupport() {
        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("الموظفين")

        val headerRow = sheet.createRow(0)
        listOf("الاسم", "القسم", "الراتب الاسمي", "المخصصات", "ايام الغياب").forEachIndexed { idx, h ->
            headerRow.createCell(idx).setCellValue(h)
        }

        val row = sheet.createRow(1)
        row.createCell(0).setCellValue("محمد علي")
        row.createCell(1).setCellValue("الهندسة")
        row.createCell(2).setCellValue("1,200,000")
        row.createCell(3).setCellValue("150,000")
        row.createCell(4).setCellValue("3")

        val out = ByteArrayOutputStream()
        workbook.write(out)
        workbook.close()

        val parser = ExcelParser()
        val result = parser.parse(ByteArrayInputStream(out.toByteArray()), "PR-2610")

        assertEquals(1, result.employees.size)
        val emp = result.employees[0]
        assertEquals("محمد علي", emp.name)
        assertEquals("الهندسة", emp.department)
        assertEquals(1200000.0, emp.baseSalary, 0.01)
        assertEquals(150000.0, emp.bonus, 0.01)
        assertEquals(3, emp.absenceDays)
        assertEquals(120000.0, emp.absenceDeduction, 0.01) // 1,200,000 / 30 * 3
    }

    @Test
    fun testArrivalFeeOnlyForDollarSalaries() {
        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("Faculty")

        val headerRow = sheet.createRow(0)
        listOf("الاسم", "الراتب الإسمي").forEachIndexed { idx, h ->
            headerRow.createCell(idx).setCellValue(h)
        }

        // Row 1: Dollar salary
        val row1 = sheet.createRow(1)
        row1.createCell(0).setCellValue("Dr. John Smith")
        row1.createCell(1).setCellValue("$2,000")

        // Row 2: Local IQD salary
        val row2 = sheet.createRow(2)
        row2.createCell(0).setCellValue("علي جاسم")
        row2.createCell(1).setCellValue("1,500,000")

        val out = ByteArrayOutputStream()
        workbook.write(out)
        workbook.close()

        val parser = ExcelParser()
        val result = parser.parse(ByteArrayInputStream(out.toByteArray()), "PR-2610")

        assertEquals(2, result.employees.size)
        val dollarEmp = result.employees[0]
        assertTrue(dollarEmp.isForeign)
        assertTrue(dollarEmp.hasRecruitmentFee)
        assertEquals(100.0, dollarEmp.recruitmentFee!!, 0.01) // 2000 * 0.05

        val localEmp = result.employees[1]
        assertFalse(localEmp.isForeign)
        assertFalse(localEmp.hasRecruitmentFee)
        assertNull(localEmp.recruitmentFee)
    }

    @Test
    fun testScaleUnder1000AndKeepAbsenceDays() {
        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("Staff")

        val headerRow = sheet.createRow(0)
        listOf("الاسم", "الراتب", "المخصصات", "الضمان", "رسم البحث", "أيام الغياب").forEachIndexed { idx, h ->
            headerRow.createCell(idx).setCellValue(h)
        }

        val row = sheet.createRow(1)
        row.createCell(0).setCellValue("حيدر ستار")
        row.createCell(1).setCellValue(750.0) // 750 should become 750,000
        row.createCell(2).setCellValue(50.0)  // 50 should become 50,000
        row.createCell(3).setCellValue(25.0)  // 25 should become 25,000
        row.createCell(4).setCellValue(10.0)  // 10 should become 10,000
        row.createCell(5).setCellValue(3.0)   // 3 days should stay 3 days

        val out = ByteArrayOutputStream()
        workbook.write(out)
        workbook.close()

        val parser = ExcelParser()
        val result = parser.parse(ByteArrayInputStream(out.toByteArray()), "PR-2610")

        assertEquals(1, result.employees.size)
        val emp = result.employees[0]
        assertEquals(750000.0, emp.baseSalary, 0.01)
        assertEquals(50000.0, emp.bonus, 0.01)
        assertEquals(25000.0, emp.insurance, 0.01)
        assertEquals(10000.0, emp.searchingDocFee!!, 0.01)
        assertEquals(3, emp.absenceDays)
        assertEquals(75000.0, emp.absenceDeduction, 0.01) // 750,000 / 30 * 3
    }

    @Test
    fun testMultipleSectionsWithDuplicateSequenceNumbersAndSubHeaders() {
        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("Medical_Tech")

        // Main Header Row: "ت", "الاسم", "الراتب"
        val header = sheet.createRow(0)
        header.createCell(0).setCellValue("ت")
        header.createCell(1).setCellValue("الاسم")
        header.createCell(2).setCellValue("الراتب")

        // Section 1: Staff 1 and 2
        val r1 = sheet.createRow(1)
        r1.createCell(0).setCellValue(1.0)
        r1.createCell(1).setCellValue("محمد عبد الرضا")
        r1.createCell(2).setCellValue(7000.0)

        val r2 = sheet.createRow(2)
        r2.createCell(0).setCellValue(2.0)
        r2.createCell(1).setCellValue("مصطفى عبد الستار")
        r2.createCell(2).setCellValue(4500.0)

        // Sub-header repeated between sections
        val subHeader = sheet.createRow(3)
        subHeader.createCell(0).setCellValue("ت")
        subHeader.createCell(1).setCellValue("الاسم التدريسي")
        subHeader.createCell(2).setCellValue("الراتب")

        // Section 2: restarts at 1 and 2!
        val r4 = sheet.createRow(4)
        r4.createCell(0).setCellValue(1.0)
        r4.createCell(1).setCellValue("حسين جميل")
        r4.createCell(2).setCellValue(5000.0)

        val r5 = sheet.createRow(5)
        r5.createCell(0).setCellValue(2.0)
        r5.createCell(1).setCellValue("ماجد فاخر")
        r5.createCell(2).setCellValue(4500.0)

        // Summary row
        val totalRow = sheet.createRow(6)
        totalRow.createCell(1).setCellValue("المجموع الكلي")
        totalRow.createCell(2).setCellValue(21000.0)

        val out = ByteArrayOutputStream()
        workbook.write(out)
        workbook.close()

        val parser = ExcelParser()
        val result = parser.parse(ByteArrayInputStream(out.toByteArray()), "PR-2610")

        // Sub-header and summary row must be skipped -> exactly 4 real employees
        assertEquals(4, result.employees.size)
        val names = result.employees.map { it.name }
        assertTrue(names.contains("محمد عبد الرضا"))
        assertTrue(names.contains("مصطفى عبد الستار"))
        assertTrue(names.contains("حسين جميل"))
        assertTrue(names.contains("ماجد فاخر"))
        assertFalse(names.contains("الاسم التدريسي"))
        assertFalse(names.contains("المجموع الكلي"))

        // All IDs must be strictly unique
        val ids = result.employees.map { it.id }
        assertEquals(4, ids.distinct().size)
    }

    @Test
    fun testScaleBaseSalaryUnder100000WithoutDollarSign() {
        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("Faculty")

        val headerRow = sheet.createRow(0)
        listOf("name", "base_salary").forEachIndexed { idx, h ->
            headerRow.createCell(idx).setCellValue(h)
        }

        // Row 1: 1500 without dollar sign -> should multiply by 1000 to become 1,500,000
        val row1 = sheet.createRow(1)
        row1.createCell(0).setCellValue("Ahmed Local")
        row1.createCell(1).setCellValue(1500.0)

        // Row 2: $2,000 with dollar sign -> foreign USD, must stay 2000
        val row2 = sheet.createRow(2)
        row2.createCell(0).setCellValue("John Foreign")
        row2.createCell(1).setCellValue("$2,000")

        // Row 3: 1,200,000 without dollar sign -> already >= 100,000, stays 1,200,000
        val row3 = sheet.createRow(3)
        row3.createCell(0).setCellValue("Ali Local Full")
        row3.createCell(1).setCellValue(1200000.0)

        val out = ByteArrayOutputStream()
        workbook.write(out)
        workbook.close()

        val parser = ExcelParser()
        val result = parser.parse(ByteArrayInputStream(out.toByteArray()), "PR-TEST")

        assertEquals(3, result.employees.size)
        assertEquals(1500000.0, result.employees[0].baseSalary, 0.01)
        assertEquals(2000.0, result.employees[1].baseSalary, 0.01)
        assertEquals(1200000.0, result.employees[2].baseSalary, 0.01)
    }

    @Test
    fun testInspectMustafaInRealWorkbook() {
        val file = java.io.File("C:/Users/Ahmed/Downloads/Documents/رواتب شهر السابع1.xlsm")
        if (!file.exists()) return

        val parser = ExcelParser()
        val result = file.inputStream().use { parser.parse(it, "PR-TEST") }

        val mustafa = result.employees.find { it.name.contains("مصطفى") && it.name.contains("عباس") }
        assertNotNull(mustafa, "Mustafa Ahmed Abbas should be parsed")
        mustafa?.let {
            assertEquals(0, it.absenceDays, "Mustafa has empty absence cell, absenceDays must be 0")
            assertEquals(0.0, it.absenceDeduction, 0.01, "Mustafa has empty absence cell, absenceDeduction must be 0.0")
            assertEquals(2000.0, it.baseSalary, 0.01)
            assertTrue(it.isForeign)
        }
    }
}

