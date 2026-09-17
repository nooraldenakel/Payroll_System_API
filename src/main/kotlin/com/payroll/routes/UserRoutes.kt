package com.payroll.routes

import com.payroll.domain.models.*
import com.payroll.domain.usecase.ManageUserUseCase
import com.payroll.plugins.authenticatedUser
import com.payroll.plugins.authenticatedUserId
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.userRoutes(
    manageUserUseCase: ManageUserUseCase
) {
    route("/api/users") {
        // List all users with pagination (default 10/page)
        get {
            val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1
            val pageSize = call.request.queryParameters["pageSize"]?.toIntOrNull()
                ?: call.request.queryParameters["limit"]?.toIntOrNull()
                ?: 10

            val paged = manageUserUseCase.getPaged(page = page, pageSize = pageSize)
            call.respond(HttpStatusCode.OK, ApiResponse(success = true, data = paged))
        }

        // Get single user by ID
        get("/{id}") {
            val id = call.parameters["id"]
            if (id.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<UserDto>(false, "User ID is required"))
                return@get
            }

            val user = manageUserUseCase.getById(id)
            if (user != null) {
                call.respond(HttpStatusCode.OK, ApiResponse(success = true, data = user))
            } else {
                call.respond(HttpStatusCode.NotFound, ApiResponse<UserDto>(false, "User not found"))
            }
        }

        // Create new user
        post {
            val req = try {
                call.receive<CreateUserRequest>()
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<UserDto>(false, "Invalid request payload: ${e.message}"))
                return@post
            }

            if (req.email.isBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<UserDto>(false, "Email is required"))
                return@post
            }
            if (req.password.isBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<UserDto>(false, "Password is required"))
                return@post
            }
            if (req.name.isBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<UserDto>(false, "Name is required"))
                return@post
            }

            val operator = call.authenticatedUser()

            try {
                val created = manageUserUseCase.createUser(req, operator = operator)
                call.respond(HttpStatusCode.Created, ApiResponse(success = true, data = created, message = "User account created successfully"))
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.Conflict, ApiResponse<UserDto>(false, e.message ?: "User creation conflict"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ApiResponse<UserDto>(false, "Failed to create user: ${e.message}"))
            }
        }

        // Update user (profile, role, status, or password reset)
        patch("/{id}") {
            val id = call.parameters["id"]
            if (id.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<UserDto>(false, "User ID is required"))
                return@patch
            }

            val req = try {
                call.receive<UpdateUserRequest>()
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<UserDto>(false, "Invalid update request: ${e.message}"))
                return@patch
            }

            val operator = call.authenticatedUser()

            try {
                val updated = manageUserUseCase.updateUser(id, req, operator = operator)
                if (updated != null) {
                    call.respond(HttpStatusCode.OK, ApiResponse(success = true, data = updated, message = "User updated successfully"))
                } else {
                    call.respond(HttpStatusCode.NotFound, ApiResponse<UserDto>(false, "User not found"))
                }
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.Conflict, ApiResponse<UserDto>(false, e.message ?: "Update conflict"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ApiResponse<UserDto>(false, "Failed to update user: ${e.message}"))
            }
        }

        // Delete user
        delete("/{id}") {
            val id = call.parameters["id"]
            if (id.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, ApiResponse<Boolean>(false, "User ID is required"))
                return@delete
            }

            val currentUserId = call.authenticatedUserId()
            if (currentUserId == id) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiResponse<Boolean>(false, "Cannot delete your own active account while logged in")
                )
                return@delete
            }

            val operator = call.authenticatedUser()
            val deleted = manageUserUseCase.deleteUser(id, operator = operator)

            if (deleted) {
                call.respond(HttpStatusCode.OK, ApiResponse(success = true, data = true, message = "User deleted and active sessions revoked"))
            } else {
                call.respond(HttpStatusCode.NotFound, ApiResponse<Boolean>(false, "User not found"))
            }
        }
    }
}
