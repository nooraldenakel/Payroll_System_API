package com.payroll.plugins

import com.payroll.domain.models.ApiResponse
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import org.slf4j.LoggerFactory

fun Application.configureStatusPages() {
    val logger = LoggerFactory.getLogger("StatusPages")

    install(StatusPages) {
        exception<Throwable> { call, cause ->
            logger.error("Unhandled API exception: ${cause.message}", cause)
            call.respond(
                HttpStatusCode.InternalServerError,
                ApiResponse<String>(
                    success = false,
                    message = cause.message ?: "Internal server error occurred",
                    data = null
                )
            )
        }

        status(HttpStatusCode.NotFound) { call, status ->
            call.respond(
                status,
                ApiResponse<String>(
                    success = false,
                    message = "Endpoint not found: ${call.request.local.uri}",
                    data = null
                )
            )
        }

        status(HttpStatusCode.TooManyRequests) { call, status ->
            val retryAfter = call.response.headers[HttpHeaders.RetryAfter] ?: "30"
            call.respond(
                status,
                ApiResponse<Map<String, String>>(
                    success = false,
                    message = "Rate limit exceeded. Too many requests. Please slow down and retry in $retryAfter seconds.",
                    data = mapOf("retryAfterSeconds" to retryAfter)
                )
            )
        }

        status(HttpStatusCode.PayloadTooLarge) { call, status ->
            call.respond(
                status,
                ApiResponse<String>(
                    success = false,
                    message = "Payload too large. Maximum file upload limit is 30 MB.",
                    data = null
                )
            )
        }
    }
}
