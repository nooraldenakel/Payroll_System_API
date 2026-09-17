package com.payroll.plugins

import io.ktor.server.application.*
import io.ktor.server.plugins.ratelimit.*
import io.ktor.server.request.*
import kotlin.time.Duration.Companion.seconds

val AUTH_RATE_LIMIT = RateLimitName("auth-protection")
val UPLOAD_RATE_LIMIT = RateLimitName("upload-protection")
val GENERAL_RATE_LIMIT = RateLimitName("general-api")

/**
 * Extracts real client IP respecting reverse proxies (Cloudflare, Nginx) or fallback.
 */
fun ApplicationCall.clientIp(): String {
    val cfConnectingIp = request.header("CF-Connecting-IP")
    if (!cfConnectingIp.isNullOrBlank()) {
        return cfConnectingIp.trim()
    }
    val xForwardedFor = request.header("X-Forwarded-For")
    if (!xForwardedFor.isNullOrBlank()) {
        return xForwardedFor.split(",").first().trim()
    }
    val xRealIp = request.header("X-Real-IP")
    if (!xRealIp.isNullOrBlank()) {
        return xRealIp.trim()
    }
    return request.local.remoteAddress
}

/**
 * Installs and configures multi-tiered DDoS and request rate limiting.
 */
fun Application.configureRateLimiting() {
    install(RateLimit) {
        // 1. Authentication Rate Limiter: 10 requests per 30 seconds per IP (anti brute-force & credential stuffing)
        register(AUTH_RATE_LIMIT) {
            rateLimiter(limit = 10, refillPeriod = 30.seconds)
            requestKey { call -> call.clientIp() }
        }

        // 2. File Upload Rate Limiter: 10 uploads per 60 seconds per IP (protects memory & POI CPU)
        register(UPLOAD_RATE_LIMIT) {
            rateLimiter(limit = 10, refillPeriod = 60.seconds)
            requestKey { call -> call.clientIp() }
        }

        // 3. General API Rate Limiter: 120 requests per 60 seconds per IP
        register(GENERAL_RATE_LIMIT) {
            rateLimiter(limit = 120, refillPeriod = 60.seconds)
            requestKey { call -> call.clientIp() }
        }
    }
}
