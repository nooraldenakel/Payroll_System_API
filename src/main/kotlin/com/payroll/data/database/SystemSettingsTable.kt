package com.payroll.data.database

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object SystemSettingsTable : Table("system_settings") {
    val id = varchar("id", 64).default("default")
    val institutionName = varchar("institution_name", 255)
    val institutionCode = varchar("institution_code", 128)
    val institutionType = varchar("institution_type", 128)
    val fiscalYear = varchar("fiscal_year", 64)
    val defaultCurrency = varchar("default_currency", 64)
    val usdToDinarRate = double("usd_to_dinar_rate").default(1310.0)
    val sealWatermarkEnabled = bool("seal_watermark_enabled").default(true)
    val sealQrEnabled = bool("seal_qr_enabled").default(true)
    val sealImageUrl = text("seal_image_url").default("")
    val autoSync = bool("auto_sync").default(true)
    val strictAudit = bool("strict_audit").default(true)
    val emailAlerts = bool("email_alerts").default(true)
    val alertRecipients = text("alert_recipients").default("")
    val autoReportSchedule = varchar("auto_report_schedule", 32).default("Monthly")
    val multiCurrency = bool("multi_currency").default(true)
    val twoFactorAuth = bool("two_factor_auth").default(true)
    val twoFactorEnforcement = varchar("two_factor_enforcement", 64).default("Admins & Disbursers")
    val sessionTimeoutMinutes = integer("session_timeout_minutes").default(15)
    val dualSignatureDisbursement = bool("dual_signature_disbursement").default(true)
    val anomalyDetectionAlerts = bool("anomaly_detection_alerts").default(true)
    val dynamicFieldsJson = text("dynamic_fields_json").nullable()
    val adminUsersJson = text("admin_users_json").nullable()
    val updatedAt = datetime("updated_at").clientDefault { LocalDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}
