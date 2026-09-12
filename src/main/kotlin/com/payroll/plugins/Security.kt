package com.payroll.plugins

import com.payroll.domain.models.ApiResponse
import com.payroll.domain.repository.IUserRepository
import com.payroll.security.JwtService
import com.payroll.security.SessionManager
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.response.*

fun Application.configureSecurity(jwtService: JwtService, userRepo: IUserRepository? = null) {
    authentication {
        jwt("auth-jwt") {
            realm = jwtService.realm
            verifier(jwtService.verifier)
            validate { credential ->
                val userId = credential.payload.getClaim("userId")?.asString()
                val tokenType = credential.payload.getClaim("type")?.asString()
                val tokenSessionId = credential.payload.getClaim("sessionId")?.asString()

                // Only allow access tokens for API authorization; refresh tokens are exclusively for the refresh endpoint
                if (!userId.isNullOrBlank() && tokenType != "refresh") {
                    // Check if token belongs to the user's single active session (invalidation if logged in from another device)
                    if (tokenSessionId != null && !SessionManager.isSessionValid(userId, tokenSessionId, userRepo)) {
                        null
                    } else {
                        JWTPrincipal(credential.payload)
                    }
                } else {
                    null
                }
            }
            challenge { _, _ ->
                call.respond(
                    HttpStatusCode.Unauthorized,
                    ApiResponse<Unit>(
                        success = false,
                        message = "Access denied. Authentication required, session expired, or your account was logged in from another device."
                    )
                )
            }
        }
    }
}

/**
 * Returns the authenticated user's ID from the JWT principal.
 */
fun ApplicationCall.authenticatedUserId(): String? {
    return principal<JWTPrincipal>()?.payload?.getClaim("userId")?.asString()
}

/**
 * Returns the authenticated user's display name or email for auditing.
 */
fun ApplicationCall.authenticatedUser(): String {
    val principal = principal<JWTPrincipal>()
    return principal?.payload?.getClaim("name")?.asString()
        ?: principal?.payload?.getClaim("email")?.asString()
        ?: "Authorized Staff"
}
