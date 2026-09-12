package com.payroll.routes

import com.payroll.domain.models.*
import com.payroll.domain.repository.IAuditLogRepository
import com.payroll.domain.repository.ISettingsRepository
import com.payroll.plugins.authenticatedUser
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.settingsRoutes(
    settingsRepo: ISettingsRepository,
    auditRepo: IAuditLogRepository
) {
    route("/api/settings") {
        get {
            val settings = settingsRepo.get()
            call.respond(
                HttpStatusCode.OK,
                ApiResponse(success = true, data = settings)
            )
        }

        patch {
            val operator = call.authenticatedUser()
            val req = call.receive<UpdateSettingsRequest>()
            val updated = settingsRepo.update(req)

            auditRepo.create(
                CreateAuditLogRequest(
                    action = "System Settings Updated",
                    user = operator,
                    detail = "Updated system configuration. Rate: ${updated.usdToDinarRate}, SessionTimeout: ${updated.sessionTimeoutMinutes}m, EmailAlerts: ${updated.emailAlerts}",
                    icon = "tune",
                    badgeColor = "bg-purple-50 text-purple-700 border border-purple-200",
                    category = "System"
                )
            )

            call.respond(
                HttpStatusCode.OK,
                ApiResponse(success = true, message = "System settings updated successfully", data = updated)
            )
        }

        get("/columns") {
            val columns = settingsRepo.getColumns()
            call.respond(
                HttpStatusCode.OK,
                ApiResponse(success = true, data = columns)
            )
        }

        put("/columns") {
            val req = try {
                call.receive<UpdateColumnsRequest>()
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<List<com.payroll.domain.models.ColumnConfigDto>>(false, "Invalid column configuration payload: ${e.message}")
                )
                return@put
            }

            if (req.columns.isEmpty()) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<List<com.payroll.domain.models.ColumnConfigDto>>(false, "Column configuration list cannot be empty")
                )
                return@put
            }

            val operator = call.authenticatedUser()
            val updated = settingsRepo.updateColumns(req.columns)

            auditRepo.create(
                CreateAuditLogRequest(
                    action = "Column Configuration Updated",
                    user = operator,
                    detail = "Updated configuration for ${updated.size} dynamic table columns and Excel header mappings",
                    icon = "view_column",
                    badgeColor = "bg-purple-50 text-purple-700 border border-purple-200",
                    category = "System"
                )
            )

            call.respond(
                HttpStatusCode.OK,
                ApiResponse(success = true, message = "Table column configurations and Excel mappings updated successfully", data = updated)
            )
        }
    }
}
