package com.payroll.routes

import com.payroll.domain.models.*
import com.payroll.domain.repository.IEmployeeRepository
import com.payroll.domain.usecase.ManageEmployeeUseCase
import com.payroll.plugins.authenticatedUser
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.employeeRoutes(
    employeeRepo: IEmployeeRepository,
    manageEmployeeUseCase: ManageEmployeeUseCase
) {
    route("/api/employees") {
        get {
            val periodId = call.request.queryParameters["periodId"]
            val department = call.request.queryParameters["department"]
            val salaryState = call.request.queryParameters["salaryState"]
            val search = call.request.queryParameters["search"]
                ?: call.request.queryParameters["q"]
                ?: call.request.queryParameters["query"]
            val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1
            val pageSize = call.request.queryParameters["pageSize"]?.toIntOrNull()
                ?: call.request.queryParameters["limit"]?.toIntOrNull()
                ?: 10

            val paged = employeeRepo.getPaged(
                periodId = periodId,
                department = department,
                salaryState = salaryState,
                search = search,
                page = page,
                pageSize = pageSize
            )

            call.respond(
                HttpStatusCode.OK,
                ApiResponse(success = true, data = paged)
            )
        }

        get("/{id}") {
            val id = call.parameters["id"]
            if (id.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<EmployeeDto>(false, "Employee ID required"))
                return@get
            }

            val emp = employeeRepo.getById(id)
            if (emp != null) {
                call.respond(HttpStatusCode.OK, ApiResponse(success = true, data = emp))
            } else {
                call.respond(HttpStatusCode.NotFound, ApiResponse<EmployeeDto>(false, "Employee not found"))
            }
        }

        post {
            val req = call.receive<CreateEmployeeRequest>()
            if (req.periodId.isBlank() || req.name.isBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<EmployeeDto>(false, "Missing periodId or employee name"))
                return@post
            }

            val operator = call.authenticatedUser()
            val created = manageEmployeeUseCase.createEmployee(req, operator = operator)
            call.respond(
                HttpStatusCode.Created,
                ApiResponse(success = true, message = "Employee created and net salary calculated", data = created)
            )
        }

        put("/{id}") {
            val id = call.parameters["id"]
            if (id.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<EmployeeDto>(false, "Employee ID required"))
                return@put
            }

            val req = call.receive<UpdateEmployeeRequest>()
            val operator = call.authenticatedUser()
            val updated = manageEmployeeUseCase.updateEmployee(id, req, operator = operator)
            if (updated != null) {
                call.respond(
                    HttpStatusCode.OK,
                    ApiResponse(success = true, message = "Employee details updated and salary recalculated", data = updated)
                )
            } else {
                call.respond(HttpStatusCode.NotFound, ApiResponse<EmployeeDto>(false, "Employee not found"))
            }
        }

        patch("/{id}") {
            val id = call.parameters["id"]
            if (id.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<EmployeeDto>(false, "Employee ID required"))
                return@patch
            }

            val req = call.receive<UpdateEmployeeRequest>()
            val operator = call.authenticatedUser()
            val updated = manageEmployeeUseCase.updateEmployee(id, req, operator = operator)
            if (updated != null) {
                call.respond(
                    HttpStatusCode.OK,
                    ApiResponse(success = true, message = "Employee details and salary recalculated", data = updated)
                )
            } else {
                call.respond(HttpStatusCode.NotFound, ApiResponse<EmployeeDto>(false, "Employee not found"))
            }
        }

        post("/{id}/toggle-payment") {
            val id = call.parameters["id"]
            if (id.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<EmployeeDto>(false, "Employee ID required"))
                return@post
            }

            val body = try {
                call.receiveNullable<TogglePaymentRequest>()
            } catch (e: Exception) {
                null
            }

            val operator = call.authenticatedUser()
            val updated = manageEmployeeUseCase.toggleSalaryPayment(id, body?.nextState, operator = operator)
            if (updated != null) {
                call.respond(
                    HttpStatusCode.OK,
                    ApiResponse(success = true, message = "Payment state updated to ${updated.salaryState}", data = updated)
                )
            } else {
                call.respond(HttpStatusCode.NotFound, ApiResponse<EmployeeDto>(false, "Employee not found"))
            }
        }

        delete("/{id}") {
            val id = call.parameters["id"]
            if (id.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<SimpleResponse>(false, "Employee ID required"))
                return@delete
            }

            val operator = call.authenticatedUser()
            val deleted = manageEmployeeUseCase.deleteEmployee(id, operator = operator)
            if (deleted) {
                call.respond(HttpStatusCode.OK, ApiResponse(success = true, data = SimpleResponse(true, "Employee deleted")))
            } else {
                call.respond(HttpStatusCode.NotFound, ApiResponse<SimpleResponse>(false, "Employee not found"))
            }
        }

        post("/batch-import") {
            val req = call.receive<BatchImportEmployeeRequest>()
            if (req.periodId.isBlank() || req.employees.isEmpty()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<BatchImportResponse>(false, "Empty batch payload"))
                return@post
            }

            val existingEmployees = employeeRepo.getAll(periodId = req.periodId)
            val existingByName = existingEmployees.associateBy { it.name.trim().lowercase() }
            val existingById = existingEmployees.associateBy { it.id.trim().lowercase() }

            val operator = call.authenticatedUser()
            var imported = 0
            for (empReq in req.employees) {
                try {
                    val existing = (empReq.id?.let { existingById[it.trim().lowercase()] })
                        ?: existingEmployees.find {
                            it.name.trim().equals(empReq.name.trim(), ignoreCase = true) &&
                            it.department.trim().equals(empReq.department.trim(), ignoreCase = true)
                        }

                    if (existing != null) {
                        manageEmployeeUseCase.updateEmployee(
                            id = existing.id,
                            req = UpdateEmployeeRequest(
                                name = empReq.name,
                                initials = empReq.initials,
                                department = empReq.department,
                                type = empReq.type,
                                baseSalary = empReq.baseSalary,
                                bonus = empReq.bonus,
                                insurance = empReq.insurance,
                                absenceDays = empReq.absenceDays,
                                absenceDeduction = empReq.absenceDeduction,
                                searchingDocFee = empReq.searchingDocFee,
                                isForeign = empReq.isForeign,
                                currency = empReq.currency,
                                hasRecruitmentFee = empReq.hasRecruitmentFee,
                                recruitmentFee = empReq.recruitmentFee,
                                salaryState = empReq.salaryState,
                                joinDate = empReq.joinDate,
                                email = empReq.email,
                                phone = empReq.phone
                            ),
                            operator = "Batch Import ($operator)"
                        )
                    } else {
                        manageEmployeeUseCase.createEmployee(empReq.copy(periodId = req.periodId), operator = "Batch Import ($operator)")
                    }
                    imported++
                } catch (e: Exception) {
                    // continue with next
                }
            }

            call.respond(
                HttpStatusCode.Created,
                ApiResponse(
                    success = true,
                    message = "Imported $imported employees into period ${req.periodId}",
                    data = BatchImportResponse(
                        importedCount = imported,
                        periodId = req.periodId,
                        totalPayrollUpdated = 0.0,
                        message = "Batch processing complete"
                    )
                )
            )
        }
    }
}
