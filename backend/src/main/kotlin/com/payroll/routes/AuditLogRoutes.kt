package com.payroll.routes

import com.payroll.domain.models.ApiResponse
import com.payroll.domain.models.AuditLogEntryDto
import com.payroll.domain.models.CreateAuditLogRequest
import com.payroll.domain.repository.IAuditLogRepository
import com.payroll.plugins.authenticatedUser
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.auditLogRoutes(auditRepo: IAuditLogRepository) {
    route("/api/audit-logs") {
        get {
            val category = call.request.queryParameters["category"]
            val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1
            val pageSize = call.request.queryParameters["pageSize"]?.toIntOrNull()
                ?: call.request.queryParameters["limit"]?.toIntOrNull()
                ?: 10

            val paged = auditRepo.getPaged(category = category, page = page, pageSize = pageSize)
            call.respond(
                HttpStatusCode.OK,
                ApiResponse(success = true, data = paged)
            )
        }

        post {
            val req = call.receive<CreateAuditLogRequest>()
            val currentUser = call.authenticatedUser()
            val actualReq = if (req.user == "System" || req.user.isBlank()) req.copy(user = currentUser) else req
            val created = auditRepo.create(actualReq)
            call.respond(
                HttpStatusCode.Created,
                ApiResponse(success = true, data = created)
            )
        }
    }
}
