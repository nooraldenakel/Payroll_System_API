package com.payroll.data.database

import com.typesafe.config.ConfigFactory
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.ktor.server.config.HoconApplicationConfig
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.or
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.transactions.transaction
import org.mindrot.jbcrypt.BCrypt
import org.slf4j.LoggerFactory
import java.time.LocalDateTime

object DatabaseFactory {
    private val logger = LoggerFactory.getLogger(DatabaseFactory::class.java)

    fun init(config: HoconApplicationConfig? = null) {
        val appConfig = config ?: HoconApplicationConfig(ConfigFactory.load())

        val dbUrl = appConfig.propertyOrNull("database.url")?.getString() ?: getEnvOrDotEnv("DB_URL","")
        val dbUser = appConfig.propertyOrNull("database.user")?.getString() ?: getEnvOrDotEnv("DB_USER", "postgres")
        val configuredPass = appConfig.propertyOrNull("database.password")?.getString()?.takeIf { it.isNotBlank() }
        val dbPassword = configuredPass ?: getEnvOrDotEnv("DB_PASSWORD", "")
        val dbDriver = appConfig.propertyOrNull("database.driver")?.getString() ?: "org.postgresql.Driver"
        val maxPoolSize = appConfig.propertyOrNull("database.maximumPoolSize")?.getString()?.toIntOrNull() ?: 10

        logger.info("Connecting to PostgreSQL at $dbUrl with user $dbUser")


        val hikariConfig = HikariConfig().apply {
            driverClassName = dbDriver
            jdbcUrl = dbUrl
            username = dbUser
            password = dbPassword
            maximumPoolSize = maxPoolSize
            isAutoCommit = false
            transactionIsolation = "TRANSACTION_REPEATABLE_READ"
            validate()
        }

        val dataSource = HikariDataSource(hikariConfig)
        Database.connect(dataSource)

        transaction {
            SchemaUtils.createMissingTablesAndColumns(
                UsersTable,
                PayrollPeriodsTable,
                EmployeesTable,
                AuditLogsTable,
                ExcelImportsTable,
                SystemSettingsTable,
                RefreshTokensTable
            )

            initializeDefaultAdminAndSettings()
        }

        logger.info("Payroll database schema initialized successfully.")
    }

    private fun getEnvOrDotEnv(key: String, default: String): String {
        val envVal = System.getenv(key)
        if (!envVal.isNullOrBlank()) return envVal
        val envFile = java.io.File(".env")
        if (envFile.exists()) {
            val line = envFile.readLines().find { it.trim().startsWith("$key=") }
            if (line != null) {
                val v = line.substringAfter("=").trim('"', '\'', ' ')
                if (v.isNotBlank()) return v
            }
        }
        return default
    }

    private fun initializeDefaultAdminAndSettings() {
        // Automatically delete placeholder admin@payroll.com user if present
        try {
            val removed = UsersTable.deleteWhere {
                (UsersTable.email eq "admin@payroll.com") or (UsersTable.id eq "u-admin")
            }
            if (removed > 0) {
                logger.info("Purged placeholder admin account ($removed record removed).")
            }
        } catch (e: Exception) {
            logger.warn("Could not purge placeholder admin user: ${e.message}")
        }

        // Initialize baseline configuration parameters if empty
        if (SystemSettingsTable.selectAll().empty()) {
            SystemSettingsTable.insert {
                it[id] = "default"
                it[institutionName] = getEnvOrDotEnv("INSTITUTION_NAME", "Payroll System")
                it[institutionCode] = getEnvOrDotEnv("INSTITUTION_CODE", "SYS-PAYROLL-01")
                it[institutionType] = "Enterprise"
                it[fiscalYear] = "2026"
                it[defaultCurrency] = "USD"
                it[usdToDinarRate] = 1.0
                it[sealWatermarkEnabled] = false
                it[sealQrEnabled] = false
                it[sealImageUrl] = ""
                it[autoSync] = false
                it[strictAudit] = true
                it[emailAlerts] = false
                it[alertRecipients] = ""
                it[autoReportSchedule] = "Monthly"
                it[multiCurrency] = false
                it[twoFactorAuth] = false
                it[twoFactorEnforcement] = "Admins"
                it[sessionTimeoutMinutes] = 30
                it[dualSignatureDisbursement] = false
                it[anomalyDetectionAlerts] = false
                it[dynamicFieldsJson] = null
                it[adminUsersJson] = null
                it[updatedAt] = LocalDateTime.now()
            }
            logger.info("Initialized default system settings.")
        }
    }

    suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO) { block() }
}
/*
*
* /NO one
*
* */