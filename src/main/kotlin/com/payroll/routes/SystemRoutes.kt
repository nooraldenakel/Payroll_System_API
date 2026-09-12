package com.payroll.routes

import com.payroll.domain.models.HealthCheckResponse
import com.payroll.domain.models.ServiceInfoResponse
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.time.LocalDateTime

fun Route.systemRoutes() {
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
                    "health" to "/health"
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
}
