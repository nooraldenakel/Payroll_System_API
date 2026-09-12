package com.payroll.domain.usecase

import com.payroll.domain.repository.ISettingsRepository

class CalculateSalaryUseCase(
    private val settingsRepo: ISettingsRepository
) {
    suspend fun calculate(
        baseSalary: Double,
        bonus: Double = 0.0,
        insurance: Double = 0.0,
        absenceDeduction: Double = 0.0,
        recruitmentFee: Double? = null,
        searchingDocFee: Double? = null,
        isForeign: Boolean = false
    ): Triple<Double, Double, Double?> {
        val settings = settingsRepo.get()
        val usdRate = settings.usdToDinarRate

        val safeRecruitment = recruitmentFee ?: 0.0
        val safeSearchFee = searchingDocFee ?: 0.0

        val totalDeductions = safeRecruitment + insurance + absenceDeduction + safeSearchFee
        val rawNet = (baseSalary - safeRecruitment) + bonus - insurance - absenceDeduction - safeSearchFee
        val netSalary = maxOf(0.0, rawNet)

        val feeIqd = if (isForeign && safeSearchFee > 0.0) {
            Math.round(safeSearchFee * usdRate).toDouble()
        } else {
            null
        }

        return Triple(netSalary, totalDeductions, feeIqd)
    }
}
