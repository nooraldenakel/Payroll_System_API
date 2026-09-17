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
        absenceDays: Int = 0,
        recruitmentFee: Double? = null,
        searchingDocFee: Double? = null,
        isForeign: Boolean = false
    ): Triple<Double, Double, Double?> {
        val settings = settingsRepo.get()
        val usdRate = if (settings.usdToDinarRate > 1.0) settings.usdToDinarRate else 1310.0

        val safeRecruitment = recruitmentFee ?: 0.0
        val rawSearch = searchingDocFee ?: 0.0

        // Sanitize fee if inflated by repeated 1000x multiplication
        fun sanitizeFee(v: Double): Double {
            var num = v
            while (num > 10_000_000.0) {
                num /= 1000.0
            }
            return num
        }

        val cleanSearch = sanitizeFee(rawSearch)
        val cleanInsurance = sanitizeFee(insurance)

        // For foreign employees, search fee and insurance from institutional Excel are in IQD -> convert to USD
        val (deductionSearch, feeIqd) = if (isForeign && cleanSearch > 0.0) {
            if (cleanSearch >= 500.0) {
                // Incoming was in IQD
                Pair(Math.round((cleanSearch / usdRate) * 100.0) / 100.0, cleanSearch)
            } else {
                // Incoming was in USD
                Pair(cleanSearch, Math.round(cleanSearch * usdRate).toDouble())
            }
        } else {
            Pair(cleanSearch, null)
        }

        val deductionInsurance = if (isForeign && cleanInsurance > 0.0) {
            if (cleanInsurance >= 500.0) {
                Math.round((cleanInsurance / usdRate) * 100.0) / 100.0
            } else {
                cleanInsurance
            }
        } else {
            cleanInsurance
        }

        val effectiveAbsenceDeduction = if (absenceDays > 0 && baseSalary > 0.0) {
            Math.round((baseSalary / 30.0 * absenceDays) * 100.0) / 100.0
        } else {
            absenceDeduction
        }

        val totalDeductions = safeRecruitment + deductionInsurance + effectiveAbsenceDeduction + deductionSearch
        val rawNet = (baseSalary - safeRecruitment) + bonus - deductionInsurance - effectiveAbsenceDeduction - deductionSearch
        val netSalary = maxOf(0.0, if (isForeign) Math.round(rawNet * 100.0) / 100.0 else Math.round(rawNet).toDouble())

        return Triple(netSalary, totalDeductions, feeIqd)
    }
}
