package com.payroll.plugins

import com.payroll.domain.repository.*
import com.payroll.domain.usecase.*
import com.payroll.routes.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.routing.*
import org.koin.ktor.ext.inject

import io.ktor.server.plugins.ratelimit.*

fun Application.configureRouting() {
    // Injected via Koin Dependency Injection Container
    val userRepo by inject<IUserRepository>()
    val periodRepo by inject<IPeriodRepository>()
    val employeeRepo by inject<IEmployeeRepository>()
    val auditRepo by inject<IAuditLogRepository>()
    val importRepo by inject<IImportRepository>()
    val settingsRepo by inject<ISettingsRepository>()

    val recalculatePeriodStatsUseCase by inject<RecalculatePeriodStatsUseCase>()
    val manageEmployeeUseCase by inject<ManageEmployeeUseCase>()
    val reportAnalyticsUseCase by inject<ReportAnalyticsUseCase>()
    val authUseCase by inject<AuthUseCase>()
    val manageUserUseCase by inject<ManageUserUseCase>()

    routing {
        // Public Endpoints
        systemRoutes()

        // Sensitive Auth Endpoints (10 req / 30s per IP against brute force)
        rateLimit(AUTH_RATE_LIMIT) {
            authPublicRoutes(authUseCase)
        }

        // Protected Endpoints — Restricted strictly to authenticated Bearer token holders
        authenticate("auth-jwt") {
            rateLimit(AUTH_RATE_LIMIT) {
                authProtectedRoutes(userRepo, authUseCase)
            }

            // File Uploads (10 uploads / 60s per IP)
            rateLimit(UPLOAD_RATE_LIMIT) {
                excelImportRoutes(importRepo, auditRepo, manageEmployeeUseCase, employeeRepo, periodRepo)
            }

            // General Business Operations (120 req / 60s per IP)
            rateLimit(GENERAL_RATE_LIMIT) {
                userRoutes(manageUserUseCase)
                periodRoutes(periodRepo, recalculatePeriodStatsUseCase, auditRepo)
                employeeRoutes(employeeRepo, manageEmployeeUseCase)
                reportsRoutes(reportAnalyticsUseCase)
                auditLogRoutes(auditRepo)
                settingsRoutes(settingsRepo, auditRepo)
            }
        }
    }
}
