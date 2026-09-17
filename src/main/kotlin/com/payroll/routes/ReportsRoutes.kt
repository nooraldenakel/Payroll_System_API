package com.payroll.routes

import com.payroll.domain.models.*
import com.payroll.domain.usecase.ReportAnalyticsUseCase
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.reportsRoutes(analyticsUseCase: ReportAnalyticsUseCase) {
    route("/api/reports") {
        get("/summary") {
            val periodId = call.request.queryParameters["periodId"]
            if (periodId.isNullOrBlank()) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<PayrollSummaryDto>(false, "Missing query parameter: periodId")
                )
                return@get
            }

            val summary = analyticsUseCase.getSummary(periodId)
            if (summary != null) {
                call.respond(HttpStatusCode.OK, ApiResponse(success = true, data = summary))
            } else {
                call.respond(HttpStatusCode.NotFound, ApiResponse<PayrollSummaryDto>(false, "Period not found"))
            }
        }

        get("/departments") {
            val periodId = call.request.queryParameters["periodId"]
            if (periodId.isNullOrBlank()) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<List<DepartmentExpenseDto>>(false, "Missing query parameter: periodId")
                )
                return@get
            }

            val list = analyticsUseCase.getDepartmentBreakdown(periodId)
            call.respond(HttpStatusCode.OK, ApiResponse(success = true, data = list))
        }

        get("/currency") {
            val periodId = call.request.queryParameters["periodId"]
            if (periodId.isNullOrBlank()) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<CurrencyBreakdownDto>(false, "Missing query parameter: periodId")
                )
                return@get
            }

            val breakdown = analyticsUseCase.getCurrencyBreakdown(periodId)
            call.respond(HttpStatusCode.OK, ApiResponse(success = true, data = breakdown))
        }
    }
}
