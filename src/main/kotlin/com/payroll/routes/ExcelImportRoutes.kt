package com.payroll.routes

import com.payroll.data.excel.ExcelParser
import com.payroll.domain.models.*
import com.payroll.domain.repository.IAuditLogRepository
import com.payroll.domain.repository.IImportRepository
import com.payroll.domain.usecase.ManageEmployeeUseCase
import com.payroll.plugins.authenticatedUser
import io.ktor.http.*
import io.ktor.http.content.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.io.ByteArrayInputStream

import com.payroll.domain.repository.IEmployeeRepository
import com.payroll.domain.repository.IPeriodRepository

fun Route.excelImportRoutes(
    importRepo: IImportRepository,
    auditRepo: IAuditLogRepository,
    manageEmployeeUseCase: ManageEmployeeUseCase,
    employeeRepo: IEmployeeRepository,
    periodRepo: IPeriodRepository
) {
    val excelParser = ExcelParser()

    route("/api") {
        post("/employees/upload-excel") {
            val periodId = call.request.queryParameters["periodId"]
            if (periodId.isNullOrBlank()) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<BatchImportResponse>(false, "Missing required query parameter: periodId")
                )
                return@post
            }

            val maxSizeBytes = 30 * 1024 * 1024L // 30 MB limit
            val contentLength = call.request.header(HttpHeaders.ContentLength)?.toLongOrNull() ?: 0L
            if (contentLength > maxSizeBytes) {
                call.respond(
                    HttpStatusCode.PayloadTooLarge,
                    ApiResponse<BatchImportResponse>(false, "File size exceeds maximum allowed upload limit of 30 MB")
                )
                return@post
            }

            var uploadedFileName = "roster.xlsx"
            var fileBytes: ByteArray? = null

            val multipart = call.receiveMultipart()
            multipart.forEachPart { part ->
                if (part is PartData.FileItem) {
                    uploadedFileName = part.originalFileName ?: "uploaded_roster.xlsx"
                    fileBytes = part.streamProvider().readBytes()
                }
                part.dispose()
            }

            if (fileBytes == null || fileBytes!!.isEmpty()) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<BatchImportResponse>(false, "No Excel file provided in multipart request")
                )
                return@post
            }

            if (fileBytes!!.size > maxSizeBytes) {
                call.respond(
                    HttpStatusCode.PayloadTooLarge,
                    ApiResponse<BatchImportResponse>(false, "File size exceeds maximum allowed upload limit of 30 MB")
                )
                return@post
            }

            try {
                val parseResult = excelParser.parse(ByteArrayInputStream(fileBytes), periodId)
                var successCount = 0
                val importErrors = parseResult.errors.toMutableList()

                val existingEmployees = employeeRepo.getAll(periodId = periodId)
                val existingByName = existingEmployees.associateBy { it.name.trim().lowercase() }
                val existingById = existingEmployees.associateBy { it.id.trim().lowercase() }

                val currentUser = call.authenticatedUser()
                for (empReq in parseResult.employees) {
                    try {
                        val existing = (empReq.id?.let { existingById[it.trim().lowercase()] })
                            ?: existingByName[empReq.name.trim().lowercase()]

                        if (existing != null) {
                            // Employee already exists in this period — update their details
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
                                operator = "Excel Import ($currentUser)"
                            )
                        } else {
                            // New employee enrollment
                            manageEmployeeUseCase.createEmployee(empReq, operator = "Excel Import ($currentUser)")
                        }
                        successCount++
                    } catch (e: Exception) {
                        importErrors.add("${empReq.name}: ${e.message}")
                    }
                }

                // Retrieve recalculated period stats
                val updatedPeriod = periodRepo.getById(periodId)
                val totalPayrollUpdated = updatedPeriod?.totalPayroll ?: 0.0

                // Record import history
                importRepo.create(
                    CreateImportRecordRequest(
                        fileName = uploadedFileName,
                        type = "Employee Rosters",
                        status = if (importErrors.isEmpty()) "Success" else "Errors",
                        recordsCount = successCount,
                        errorCount = importErrors.size,
                        importedBy = currentUser
                    )
                )

                // Audit log
                auditRepo.create(
                    CreateAuditLogRequest(
                        action = "Excel Roster Imported",
                        user = currentUser,
                        detail = "Imported/Updated $successCount employee records into period $periodId from file $uploadedFileName (${importErrors.size} errors)",
                        icon = "upload_file",
                        badgeColor = "bg-indigo-50 text-indigo-700 border border-indigo-200",
                        category = "Import"
                    )
                )

                call.respond(
                    HttpStatusCode.Created,
                    ApiResponse(
                        success = true,
                        message = "Excel roster imported: $successCount employees processed into period $periodId",
                        data = BatchImportResponse(
                            importedCount = successCount,
                            periodId = periodId,
                            totalPayrollUpdated = totalPayrollUpdated,
                            message = if (importErrors.isEmpty()) "Import completed with 0 errors" else "Import completed with ${importErrors.size} warnings/errors"
                        )
                    )
                )
            } catch (err: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ApiResponse<BatchImportResponse>(false, "Failed to parse Excel file: ${err.message}")
                )
            }
        }

        route("/imports") {
            get {
                val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1
                val pageSize = call.request.queryParameters["pageSize"]?.toIntOrNull()
                    ?: call.request.queryParameters["limit"]?.toIntOrNull()
                    ?: 10

                val paged = importRepo.getPaged(page = page, pageSize = pageSize)
                call.respond(
                    HttpStatusCode.OK,
                    ApiResponse(success = true, data = paged)
                )
            }

            post {
                val operator = call.authenticatedUser()
                val req = call.receive<CreateImportRecordRequest>()
                val created = importRepo.create(req)

                auditRepo.create(
                    CreateAuditLogRequest(
                        action = "Import Record Logged",
                        user = operator,
                        detail = "Logged roster import history for '${created.fileName}' (${created.recordsCount} records, ${created.errorCount} errors)",
                        icon = "post_add",
                        badgeColor = "bg-blue-50 text-blue-700 border border-blue-200",
                        category = "System"
                    )
                )

                call.respond(
                    HttpStatusCode.Created,
                    ApiResponse(success = true, data = created)
                )
            }

            delete {
                val operator = call.authenticatedUser()
                val id = call.request.queryParameters["id"]
                val deleted = importRepo.delete(id)

                if (deleted) {
                    auditRepo.create(
                        CreateAuditLogRequest(
                            action = "Import History Cleared",
                            user = operator,
                            detail = if (id != null) "Deleted Excel import entry '$id'" else "Cleared all Excel roster import history logs",
                            icon = "delete_sweep",
                            badgeColor = "bg-amber-50 text-amber-700 border border-amber-200",
                            category = "System"
                        )
                    )
                }

                call.respond(
                    HttpStatusCode.OK,
                    ApiResponse(success = true, data = SimpleResponse(deleted, "Import history cleared"))
                )
            }
        }
    }
}
