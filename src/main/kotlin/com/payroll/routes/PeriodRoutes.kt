package com.payroll.routes

import com.payroll.domain.models.*
import com.payroll.domain.repository.IAuditLogRepository
import com.payroll.domain.repository.IPeriodRepository
import com.payroll.domain.usecase.RecalculatePeriodStatsUseCase
import com.payroll.plugins.authenticatedUser
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.periodRoutes(
    periodRepo: IPeriodRepository,
    recalculatePeriodStats: RecalculatePeriodStatsUseCase,
    auditRepo: IAuditLogRepository
) {
    route("/api/periods") {
        get {
            val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1
            val pageSize = call.request.queryParameters["pageSize"]?.toIntOrNull()
                ?: call.request.queryParameters["limit"]?.toIntOrNull()
                ?: 10

            val paged = periodRepo.getPaged(page = page, pageSize = pageSize)
            call.respond(
                HttpStatusCode.OK,
                ApiResponse(success = true, data = paged)
            )
        }

        get("/{id}") {
            val id = call.parameters["id"]
            if (id.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<PayrollPeriodDto>(false, "Period ID required"))
                return@get
            }

            val period = periodRepo.getById(id)
            if (period != null) {
                call.respond(HttpStatusCode.OK, ApiResponse(success = true, data = period))
            } else {
                call.respond(HttpStatusCode.NotFound, ApiResponse<PayrollPeriodDto>(false, "Period not found"))
            }
        }

        post {
            val req = call.receive<CreatePeriodRequest>()
            val operator = call.authenticatedUser()
            val effectiveReq = if (req.creator.isNullOrBlank()) req.copy(creator = operator) else req
            val created = periodRepo.create(effectiveReq)

            auditRepo.create(
                CreateAuditLogRequest(
                    action = "Period Created",
                    user = operator,
                    detail = "Created payroll period '${created.name}' (${created.id}) for ${created.month} ${created.year} [Status: ${created.status}]",
                    icon = "calendar_add_on",
                    badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-200",
                    category = "Period"
                )
            )

            call.respond(
                HttpStatusCode.Created,
                ApiResponse(success = true, message = "Period created successfully", data = created)
            )
        }

        patch("/{id}") {
            val id = call.parameters["id"]
            if (id.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<PayrollPeriodDto>(false, "Period ID required"))
                return@patch
            }

            val req = call.receive<UpdatePeriodRequest>()
            val operator = call.authenticatedUser()
            val updated = periodRepo.update(id, req)
            if (updated != null) {
                auditRepo.create(
                    CreateAuditLogRequest(
                        action = "Period Updated",
                        user = operator,
                        detail = "Updated payroll period '${updated.name}' ($id). Status: ${updated.status}, TotalPayroll: ${updated.totalPayroll}",
                        icon = "edit_calendar",
                        badgeColor = "bg-blue-50 text-blue-700 border border-blue-200",
                        category = "Period"
                    )
                )
                call.respond(HttpStatusCode.OK, ApiResponse(success = true, message = "Period updated", data = updated))
            } else {
                call.respond(HttpStatusCode.NotFound, ApiResponse<PayrollPeriodDto>(false, "Period not found"))
            }
        }

        delete("/{id}") {
            val id = call.parameters["id"]
            if (id.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<SimpleResponse>(false, "Period ID required"))
                return@delete
            }

            val operator = call.authenticatedUser()
            val deleted = periodRepo.delete(id)
            if (deleted) {
                auditRepo.create(
                    CreateAuditLogRequest(
                        action = "Period Deleted",
                        user = operator,
                        detail = "Terminated and removed payroll period '$id' and associated roster records",
                        icon = "event_busy",
                        badgeColor = "bg-rose-50 text-rose-700 border border-rose-200",
                        category = "Period"
                    )
                )
                call.respond(HttpStatusCode.OK, ApiResponse(success = true, data = SimpleResponse(true, "Period deleted")))
            } else {
                call.respond(HttpStatusCode.NotFound, ApiResponse<SimpleResponse>(false, "Period not found"))
            }
        }

        post("/{id}/recalculate") {
            val id = call.parameters["id"]
            if (id.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<PayrollPeriodDto>(false, "Period ID required"))
                return@post
            }

            val operator = call.authenticatedUser()
            recalculatePeriodStats.execute(id)
            val updated = periodRepo.getById(id)

            if (updated != null) {
                auditRepo.create(
                    CreateAuditLogRequest(
                        action = "Period Totals Recalculated",
                        user = operator,
                        detail = "Recalculated financial totals for period '${updated.name}' ($id). Net: ${updated.totalPayroll}, Paid: ${updated.paidAmount}",
                        icon = "calculate",
                        badgeColor = "bg-indigo-50 text-indigo-700 border border-indigo-200",
                        category = "Salary"
                    )
                )
            }

            call.respond(
                HttpStatusCode.OK,
                ApiResponse(success = true, message = "Period aggregates recalculated", data = updated)
            )
        }
    }
}
