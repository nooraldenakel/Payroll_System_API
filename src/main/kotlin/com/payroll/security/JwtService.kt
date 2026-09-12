package com.payroll.security

import com.auth0.jwt.JWT
import com.auth0.jwt.JWTVerifier
import com.auth0.jwt.algorithms.Algorithm
import com.auth0.jwt.interfaces.DecodedJWT
import com.payroll.domain.models.UserDto
import com.typesafe.config.ConfigFactory
import io.ktor.server.config.*
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.*

class JwtService(config: ApplicationConfig? = null) {
    private val appConfig = config ?: HoconApplicationConfig(ConfigFactory.load())

    val secret: String = appConfig.propertyOrNull("jwt.secret")?.getString()
        ?: "payroll-insight-pro-super-secure-jwt-secret-key-2026"
    val issuer: String = appConfig.propertyOrNull("jwt.issuer")?.getString()
        ?: "com.payroll.insight"
    val audience: String = appConfig.propertyOrNull("jwt.audience")?.getString()
        ?: "payroll-app-users"
    val realm: String = appConfig.propertyOrNull("jwt.realm")?.getString()
        ?: "Payroll Insight Pro"

    private val algorithm = Algorithm.HMAC256(secret)

    val verifier: JWTVerifier = JWT.require(algorithm)
        .withIssuer(issuer)
        .withAudience(audience)
        .build()

    companion object {
        const val ACCESS_TOKEN_VALIDITY_MS: Long = 24 * 3600 * 1000L // 24 hours
        const val REFRESH_TOKEN_VALIDITY_MS: Long = 7 * 24 * 3600 * 1000L // 7 days
    }

    /**
     * Generates a 24-hour Access Token containing user claims and optional active sessionId.
     */
    fun generateAccessToken(user: UserDto, sessionId: String? = null): String {
        val now = System.currentTimeMillis()
        val expiresAt = Date(now + ACCESS_TOKEN_VALIDITY_MS)

        val builder = JWT.create()
            .withJWTId(UUID.randomUUID().toString())
            .withSubject(user.id)
            .withIssuer(issuer)
            .withAudience(audience)
            .withClaim("userId", user.id)
            .withClaim("email", user.email)
            .withClaim("name", user.name)
            .withClaim("role", user.role)
            .withClaim("type", "access")
            .withIssuedAt(Date(now))
            .withExpiresAt(expiresAt)

        if (sessionId != null) {
            builder.withClaim("sessionId", sessionId)
        }

        return builder.sign(algorithm)
    }

    /**
     * Generates a 7-day Refresh Token and returns both the signed token string and expiration LocalDateTime.
     */
    fun generateRefreshToken(user: UserDto, sessionId: String? = null): Pair<String, LocalDateTime> {
        val now = System.currentTimeMillis()
        val expiresEpoch = now + REFRESH_TOKEN_VALIDITY_MS
        val expiresDate = Date(expiresEpoch)
        val expiresLocal = LocalDateTime.ofInstant(expiresDate.toInstant(), ZoneId.systemDefault())

        val builder = JWT.create()
            .withJWTId(UUID.randomUUID().toString())
            .withSubject(user.id)
            .withIssuer(issuer)
            .withAudience(audience)
            .withClaim("userId", user.id)
            .withClaim("email", user.email)
            .withClaim("type", "refresh")
            .withIssuedAt(Date(now))
            .withExpiresAt(expiresDate)

        if (sessionId != null) {
            builder.withClaim("sessionId", sessionId)
        }

        val token = builder.sign(algorithm)
        return Pair(token, expiresLocal)
    }

    /**
     * Decodes and validates the token signature and expiration.
     */
    fun verifyToken(token: String): DecodedJWT? {
        return try {
            verifier.verify(token)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Helper to extract userId from token claims.
     */
    fun extractUserId(token: String): String? {
        return verifyToken(token)?.getClaim("userId")?.asString()
    }
}
