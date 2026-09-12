package com.payroll.domain.models

import kotlinx.serialization.Serializable

@Serializable
data class ColumnConfigDto(
    val key: String,
    val label: String,
    val type: String = "Text", // "Text" | "Currency" | "Number" | "Boolean" | "Date"
    val visible: Boolean = true,
    val required: Boolean = false,
    val excelAliases: List<String> = emptyList()
)

@Serializable
data class UpdateColumnsRequest(
    val columns: List<ColumnConfigDto>
)

@Serializable
data class SystemSettingsDto(
    val id: String = "default",
    val institutionName: String,
    val institutionCode: String,
    val institutionType: String,
    val fiscalYear: String,
    val defaultCurrency: String,
    val usdToDinarRate: Double,
    val sealWatermarkEnabled: Boolean,
    val sealQrEnabled: Boolean,
    val sealImageUrl: String,
    val autoSync: Boolean,
    val strictAudit: Boolean,
    val emailAlerts: Boolean,
    val alertRecipients: String,
    val autoReportSchedule: String,
    val multiCurrency: Boolean,
    val twoFactorAuth: Boolean,
    val twoFactorEnforcement: String,
    val sessionTimeoutMinutes: Int,
    val dualSignatureDisbursement: Boolean,
    val anomalyDetectionAlerts: Boolean,
    val dynamicFieldsJson: String? = null,
    val adminUsersJson: String? = null
)

@Serializable
data class UpdateSettingsRequest(
    val institutionName: String? = null,
    val institutionCode: String? = null,
    val institutionType: String? = null,
    val fiscalYear: String? = null,
    val defaultCurrency: String? = null,
    val usdToDinarRate: Double? = null,
    val sealWatermarkEnabled: Boolean? = null,
    val sealQrEnabled: Boolean? = null,
    val sealImageUrl: String? = null,
    val autoSync: Boolean? = null,
    val strictAudit: Boolean? = null,
    val emailAlerts: Boolean? = null,
    val alertRecipients: String? = null,
    val autoReportSchedule: String? = null,
    val multiCurrency: Boolean? = null,
    val twoFactorAuth: Boolean? = null,
    val twoFactorEnforcement: String? = null,
    val sessionTimeoutMinutes: Int? = null,
    val dualSignatureDisbursement: Boolean? = null,
    val anomalyDetectionAlerts: Boolean? = null,
    val dynamicFieldsJson: String? = null,
    val adminUsersJson: String? = null
)
