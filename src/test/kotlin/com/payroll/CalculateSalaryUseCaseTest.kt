package com.payroll

import com.payroll.domain.models.SystemSettingsDto
import com.payroll.domain.repository.ISettingsRepository
import com.payroll.domain.usecase.CalculateSalaryUseCase
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class CalculateSalaryUseCaseTest {

    private val dummySettings = SystemSettingsDto(
        id = "default",
        institutionName = "University Test",
        institutionCode = "TEST-01",
        institutionType = "Higher Education",
        fiscalYear = "2026",
        defaultCurrency = "IQD",
        usdToDinarRate = 1310.0,
        sealWatermarkEnabled = false,
        sealQrEnabled = false,
        sealImageUrl = "",
        autoSync = false,
        strictAudit = false,
        emailAlerts = false,
        alertRecipients = "",
        autoReportSchedule = "",
        multiCurrency = false,
        twoFactorAuth = false,
        twoFactorEnforcement = "",
        sessionTimeoutMinutes = 30,
        dualSignatureDisbursement = false,
        anomalyDetectionAlerts = false
    )

    private val mockSettingsRepo = object : ISettingsRepository {
        override suspend fun get(): SystemSettingsDto = dummySettings
        override suspend fun update(updates: com.payroll.domain.models.UpdateSettingsRequest): SystemSettingsDto = dummySettings
        override suspend fun getColumns(): List<com.payroll.domain.models.ColumnConfigDto> = emptyList()
        override suspend fun updateColumns(columns: List<com.payroll.domain.models.ColumnConfigDto>): List<com.payroll.domain.models.ColumnConfigDto> = emptyList()
    }

    @Test
    fun testAbsenceDaysCostCalculationAndNetSalarySubtraction() = runBlocking {
        val useCase = CalculateSalaryUseCase(mockSettingsRepo)

        // Base salary = 900,000, 2 absence days
        // Day cost = 900,000 / 30 = 30,000
        // Absence deduction = 30,000 * 2 = 60,000
        // Net salary = 900,000 - 60,000 = 840,000
        val (netSalary, totalDeductions, _) = useCase.calculate(
            baseSalary = 900000.0,
            bonus = 0.0,
            insurance = 0.0,
            absenceDays = 2
        )

        assertEquals(840000.0, netSalary, 0.01)
        assertEquals(60000.0, totalDeductions, 0.01)
    }

    @Test
    fun testAbsenceDaysWithBonusAndInsurance() = runBlocking {
        val useCase = CalculateSalaryUseCase(mockSettingsRepo)

        // Base salary = 1,200,000, Bonus = 100,000, Insurance = 50,000
        // 3 absence days -> 1,200,000 / 30 * 3 = 120,000
        // Net = 1,200,000 + 100,000 - 50,000 - 120,000 = 1,130,000
        val (netSalary, totalDeductions, _) = useCase.calculate(
            baseSalary = 1200000.0,
            bonus = 100000.0,
            insurance = 50000.0,
            absenceDays = 3
        )

        assertEquals(1130000.0, netSalary, 0.01)
        assertEquals(170000.0, totalDeductions, 0.01) // 50,000 + 120,000
    }

    @Test
    fun testArrivalFeeCalculationAndSubtractionFromNet() = runBlocking {
        val useCase = CalculateSalaryUseCase(mockSettingsRepo)

        // Base salary = $2,000, Foreign = true
        // Arrival fee (5%) = 2,000 * 0.05 = 100.0
        // Net salary = 2,000 - 100 = 1,900.0
        val (netSalary, totalDeductions, _) = useCase.calculate(
            baseSalary = 2000.0,
            bonus = 0.0,
            insurance = 0.0,
            recruitmentFee = 100.0,
            isForeign = true
        )

        assertEquals(1900.0, netSalary, 0.01)
        assertEquals(100.0, totalDeductions, 0.01)
    }
}
