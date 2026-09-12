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
}
