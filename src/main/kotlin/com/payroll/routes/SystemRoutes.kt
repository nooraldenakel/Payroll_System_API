package com.payroll.routes

import com.payroll.data.database.DatabaseFactory
import com.payroll.domain.models.ApiResponse
import com.payroll.domain.models.HealthCheckResponse
import com.payroll.domain.models.ServiceInfoResponse
import com.payroll.domain.models.SimpleResponse
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.time.LocalDateTime

fun Route.systemRoutes(auditRepo: com.payroll.domain.repository.IAuditLogRepository? = null) {
    get("/") {
        call.respond(
            HttpStatusCode.OK,
            ServiceInfoResponse(
                service = "Payroll Insight Pro REST API",
                version = "1.0.0",
                status = "operational",
                endpoints = mapOf(
                    "authLogin" to "/api/auth/login",
                    "authRefresh" to "/api/auth/refresh",
                    "authProfile" to "/api/auth/me",
                    "authLogout" to "/api/auth/logout",
                    "periods" to "/api/periods",
                    "employees" to "/api/employees",
                    "excelUpload" to "/api/employees/upload-excel?periodId={periodId}",
                    "batchImport" to "/api/employees/batch-import",
                    "reportsSummary" to "/api/reports/summary?periodId={periodId}",
                    "departmentReports" to "/api/reports/departments?periodId={periodId}",
                    "currencyReports" to "/api/reports/currency?periodId={periodId}",
                    "auditLogs" to "/api/audit-logs",
                    "importHistory" to "/api/imports",
                    "settings" to "/api/settings",
                    "health" to "/health",
                    "seed" to "/api/seed?reset=true"
                )
            )
        )
    }

    get("/health") {
        call.respond(
            HttpStatusCode.OK,
            HealthCheckResponse(
                status = "UP",
                database = "PostgreSQL (payroll_insight_db)",
                timestamp = LocalDateTime.now().toString()
            )
        )
    }

    post("/api/seed") {
        val reset = call.request.queryParameters["reset"]?.toBoolean() ?: false
        if (reset) {
            DatabaseFactory.reseedDatabase()
            auditRepo?.create(
                com.payroll.domain.models.CreateAuditLogRequest(
                    action = "Database Reseeded",
                    user = "System / Administrator",
                    detail = "Database was reseeded with default institutional roster, periods, and audit trail",
                    icon = "restart_alt",
                    badgeColor = "bg-teal-50 text-teal-700 border border-teal-200",
                    category = "System"
                )
            )
            call.respond(
                HttpStatusCode.OK,
                ApiResponse(
                    success = true,
                    message = "Database reseeded successfully with real institutional roster, periods, and audit trail.",
                    data = SimpleResponse(true, "Database reseeded with real enterprise records")
                )
            )
        } else {
            call.respond(
                HttpStatusCode.OK,
                ApiResponse(
                    success = true,
                    message = "Database schema and seeds are active. Use /api/seed?reset=true to force reseed with real records.",
                    data = SimpleResponse(true, "Database connected and operational")
                )
            )
        }
    }
}
