package com.payroll.data.database

import com.typesafe.config.ConfigFactory
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.ktor.server.config.HoconApplicationConfig
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.insert
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

        val dbUrl = appConfig.propertyOrNull("database.url")?.getString()
            ?: "jdbc:postgresql://localhost:5432/payroll_insight_db"
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
        val adminEmail = getEnvOrDotEnv("DEFAULT_ADMIN_EMAIL", getEnvOrDotEnv("ADMIN_EMAIL", "admin@payroll.com"))
        val defaultAdminPass = getEnvOrDotEnv("DEFAULT_ADMIN_PASSWORD", "admin123")
        val adminName = getEnvOrDotEnv("DEFAULT_ADMIN_NAME", getEnvOrDotEnv("ADMIN_NAME", "System Administrator"))

        val adminExists = !UsersTable.selectAll().where { UsersTable.email eq adminEmail.lowercase() }.empty()
        if (!adminExists) {
            val salt = BCrypt.gensalt(10)
            val passHash = BCrypt.hashpw(defaultAdminPass, salt)

            UsersTable.insert {
                it[id] = "u-admin"
                it[email] = adminEmail.lowercase()
                it[passwordHash] = passHash
                it[name] = adminName
                it[initials] = adminName.split(" ").filter { it.isNotBlank() }.take(2).map { it.first() }.joinToString("").uppercase().ifBlank { "SA" }
                it[role] = "Super Admin"
                it[status] = "Active"
                it[avatar] = null
                it[createdAt] = LocalDateTime.now()
                it[updatedAt] = LocalDateTime.now()
            }
            logger.info("Initialized default administrator account ($adminEmail).")
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
