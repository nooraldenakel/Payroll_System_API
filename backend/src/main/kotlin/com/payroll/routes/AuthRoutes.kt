package com.payroll.routes

import com.payroll.domain.models.*
import com.payroll.domain.repository.IUserRepository
import com.payroll.domain.usecase.AuthUseCase
import com.payroll.plugins.authenticatedUserId
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.authPublicRoutes(authUseCase: AuthUseCase) {
    route("/api/auth") {
        post("/login") {
            val req = call.receive<LoginRequest>()
            val loginRes = authUseCase.login(req)
            if (loginRes != null) {
                call.respond(
                    HttpStatusCode.OK,
                    ApiResponse(
                        success = true,
                        message = "Institutional authentication successful",
                        data = loginRes
                    )
                )
            } else {
                call.respond(
                    HttpStatusCode.Unauthorized,
                    ApiResponse<LoginResponse>(
                        success = false,
                        message = "Invalid institutional email or password",
                        data = null
                    )
                )
            }
        }

        post("/refresh") {
            val req = call.receive<RefreshTokenRequest>()
            val tokenRes = authUseCase.refreshToken(req)
            if (tokenRes != null) {
                call.respond(
                    HttpStatusCode.OK,
                    ApiResponse(
                        success = true,
                        message = "Access token refreshed successfully",
                        data = tokenRes
                    )
                )
            } else {
                val isConflict = authUseCase.isDeviceConflict(req.refreshToken)
                if (isConflict) {
                    call.response.header("X-Session-Status", "TERMINATED_BY_ANOTHER_DEVICE")
                    call.respond(
                        HttpStatusCode.Unauthorized,
                        ApiResponse<RefreshTokenResponse>(
                            success = false,
                            code = "DEVICE_SESSION_TERMINATED",
                            message = "You have been logged in from another device.",
                            data = null
                        )
                    )
                } else {
                    call.respond(
                        HttpStatusCode.Unauthorized,
                        ApiResponse<RefreshTokenResponse>(
                            success = false,
                            code = "REFRESH_FAILED",
                            message = "Refresh token is invalid, expired, or has been revoked",
                            data = null
                        )
                    )
                }
            }
        }
    }
}

fun Route.authProtectedRoutes(userRepo: IUserRepository, authUseCase: AuthUseCase) {
    route("/api/auth") {
        get("/me") {
            val userId = call.authenticatedUserId()
            if (userId.isNullOrBlank()) {
                call.respond(
                    HttpStatusCode.Unauthorized,
                    ApiResponse<UserDto>(success = false, message = "User not identified in token")
                )
                return@get
            }

            val user = userRepo.findById(userId)
            if (user != null) {
                call.respond(
                    HttpStatusCode.OK,
                    ApiResponse(success = true, data = user)
                )
            } else {
                call.respond(
                    HttpStatusCode.NotFound,
                    ApiResponse<UserDto>(success = false, message = "User profile not found in database")
                )
            }
        }

        get("/session-status") {
            val userId = call.authenticatedUserId()
            if (userId.isNullOrBlank()) {
                call.respond(
                    HttpStatusCode.Unauthorized,
                    ApiResponse<Map<String, String>>(
                        success = false,
                        code = "UNAUTHORIZED",
                        message = "Session expired or invalid"
                    )
                )
                return@get
            }

            call.respond(
                HttpStatusCode.OK,
                ApiResponse(
                    success = true,
                    code = "ACTIVE",
                    message = "Session active and authorized",
                    data = mapOf("status" to "ACTIVE", "userId" to userId)
                )
            )
        }

        post("/logout") {
            val userId = call.authenticatedUserId()
            val req = try {
                call.receiveNullable<RefreshTokenRequest>()
            } catch (e: Exception) {
                null
            }

            authUseCase.logout(userId, req?.refreshToken)

            call.respond(
                HttpStatusCode.OK,
                ApiResponse(
                    success = true,
                    message = "Session terminated and refresh tokens revoked successfully",
                    data = SimpleResponse(success = true, message = "Session revoked")
                )
            )
        }
    }
}
