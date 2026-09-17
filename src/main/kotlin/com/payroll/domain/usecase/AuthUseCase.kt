package com.payroll.domain.usecase

import com.payroll.domain.models.*
import com.payroll.domain.repository.IAuditLogRepository
import com.payroll.domain.repository.IRefreshTokenRepository
import com.payroll.domain.repository.IUserRepository
import com.payroll.security.JwtService
import com.payroll.security.SessionManager
import org.mindrot.jbcrypt.BCrypt
import java.util.UUID

class AuthUseCase(
    private val userRepo: IUserRepository,
    private val refreshTokenRepo: IRefreshTokenRepository,
    val jwtService: JwtService,
    private val auditRepo: IAuditLogRepository
) {
    suspend fun isDeviceConflict(refreshToken: String): Boolean {
        return try {
            val decoded = jwtService.verifyToken(refreshToken) ?: return false
            val userId = decoded.getClaim("userId")?.asString() ?: return false
            val tokenSessionId = decoded.getClaim("sessionId")?.asString() ?: return false
            val currentActive = SessionManager.getActiveSession(userId) ?: userRepo.getActiveSession(userId)
            currentActive != null && currentActive != tokenSessionId
        } catch (_: Exception) {
            false
        }
    }
    /**
     * Authenticates user against BCrypt password hash and generates 24h access token + 7d refresh token.
     */
    suspend fun login(req: LoginRequest): LoginResponse? {
        val normalizedEmail = req.email.trim().lowercase()
        val user = userRepo.findByEmail(normalizedEmail)
        if (user == null) {
            auditRepo.create(
                CreateAuditLogRequest(
                    action = "Failed Login",
                    user = normalizedEmail,
                    detail = "Failed authentication attempt: User '$normalizedEmail' not found",
                    icon = "lock_clock",
                    badgeColor = "bg-rose-50 text-rose-700 border border-rose-200",
                    category = "Security"
                )
            )
            return null
        }

        if (!user.status.equals("Active", ignoreCase = true)) {
            auditRepo.create(
                CreateAuditLogRequest(
                    action = "Failed Login",
                    user = user.name,
                    detail = "Failed authentication attempt: Account for ${user.name} (${user.email}) is ${user.status}",
                    icon = "lock_clock",
                    badgeColor = "bg-rose-50 text-rose-700 border border-rose-200",
                    employeeId = user.id,
                    employeeName = user.name,
                    category = "Security"
                )
            )
            return null
        }

        val hash = userRepo.getPasswordHash(normalizedEmail)
        if (hash == null) {
            return null
        }
        val matches = try {
            BCrypt.checkpw(req.password, hash)
        } catch (e: Exception) {
            false
        }

        if (!matches) {
            auditRepo.create(
                CreateAuditLogRequest(
                    action = "Failed Login",
                    user = user.name,
                    detail = "Failed authentication attempt: Incorrect password for ${user.name} (${user.email})",
                    icon = "lock_clock",
                    badgeColor = "bg-rose-50 text-rose-700 border border-rose-200",
                    employeeId = user.id,
                    employeeName = user.name,
                    category = "Security"
                )
            )
            return null
        }

        // Enforce single active session: revoke all prior sessions/refresh tokens for this user on any device
        refreshTokenRepo.revokeAllForUser(user.id)
        val newSessionId = UUID.randomUUID().toString()
        userRepo.updateActiveSession(user.id, newSessionId)
        SessionManager.setActiveSession(user.id, newSessionId)

        // Generate 24-hour access token and 7-day refresh token tied to this active session
        val accessToken = jwtService.generateAccessToken(user, newSessionId)
        val (refreshToken, expiresAt) = jwtService.generateRefreshToken(user, newSessionId)

        // Persist refresh token in database for tracking & revocation
        refreshTokenRepo.save(
            id = "RT-${UUID.randomUUID()}",
            userId = user.id,
            token = refreshToken,
            expiresAt = expiresAt
        )

        auditRepo.create(
            CreateAuditLogRequest(
                action = "User Login",
                user = user.name,
                detail = "Authentication successful for ${user.name} (${user.email}). All previous device sessions revoked.",
                icon = "login",
                badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-200",
                employeeId = user.id,
                employeeName = user.name,
                category = "Security"
            )
        )

        return LoginResponse(
            user = user.copy(activeSessionId = newSessionId),
            accessToken = accessToken,
            refreshToken = refreshToken,
            tokenType = "Bearer",
            expiresIn = 86400, // 24 hours
            token = accessToken
        )
    }

    /**
     * Validates an existing refresh token, checks DB revocation, issues new 24h access token and rotates refresh token.
     */
    suspend fun refreshToken(req: RefreshTokenRequest): RefreshTokenResponse? {
        val rawToken = req.refreshToken.trim()
        if (rawToken.isBlank()) return null

        // 1. Verify JWT signature & validity
        val decoded = jwtService.verifyToken(rawToken) ?: return null
        val tokenType = decoded.getClaim("type")?.asString()
        if (tokenType != "refresh") {
            return null
        }

        val userId = decoded.getClaim("userId")?.asString() ?: return null
        val tokenSessionId = decoded.getClaim("sessionId")?.asString()

        // Verify that this token belongs to the CURRENT active session (reject if user logged in elsewhere)
        if (tokenSessionId != null && !SessionManager.isSessionValid(userId, tokenSessionId, userRepo)) {
            return null
        }

        // 2. Check token in database and confirm not revoked
        val tokenRecord = refreshTokenRepo.findByToken(rawToken) ?: return null
        if (tokenRecord.isRevoked) {
            return null
        }

        // 3. Confirm user exists and is active
        val user = userRepo.findById(userId) ?: return null
        if (!user.status.equals("Active", ignoreCase = true)) {
            return null
        }

        // 4. Revoke used refresh token (rotation policy)
        refreshTokenRepo.revoke(rawToken)

        // 5. Generate new access token and rotated refresh token keeping the active session
        val currentSessionId = tokenSessionId ?: user.activeSessionId ?: UUID.randomUUID().toString()
        val newAccessToken = jwtService.generateAccessToken(user, currentSessionId)
        val (newRefreshToken, newExpiresAt) = jwtService.generateRefreshToken(user, currentSessionId)

        refreshTokenRepo.save(
            id = "RT-${UUID.randomUUID()}",
            userId = user.id,
            token = newRefreshToken,
            expiresAt = newExpiresAt
        )

        auditRepo.create(
            CreateAuditLogRequest(
                action = "Token Refreshed",
                user = user.name,
                detail = "Rotated session refresh token and renewed 24-hour access token for ${user.name}",
                icon = "sync",
                badgeColor = "bg-blue-50 text-blue-700 border border-blue-200",
                employeeId = user.id,
                employeeName = user.name,
                category = "Security"
            )
        )

        return RefreshTokenResponse(
            accessToken = newAccessToken,
            refreshToken = newRefreshToken,
            tokenType = "Bearer",
            expiresIn = 86400,
            token = newAccessToken
        )
    }

    /**
     * Terminates session by revoking refresh token(s) and invalidating active session.
     */
    suspend fun logout(userId: String?, refreshToken: String? = null): Boolean {
        var revoked = false
        if (!refreshToken.isNullOrBlank()) {
            revoked = refreshTokenRepo.revoke(refreshToken)
        }
        if (!userId.isNullOrBlank()) {
            revoked = refreshTokenRepo.revokeAllForUser(userId) || revoked
            SessionManager.invalidateSession(userId)
            userRepo.updateActiveSession(userId, null)
        }

        val userName = if (userId != null) userRepo.findById(userId)?.name ?: "Authorized User" else "Authorized User"
        auditRepo.create(
            CreateAuditLogRequest(
                action = "User Logout",
                user = userName,
                detail = "User session terminated and all device tokens revoked",
                icon = "logout",
                badgeColor = "bg-slate-50 text-slate-700 border border-slate-200",
                employeeId = userId,
                employeeName = userName,
                category = "Security"
            )
        )

        return revoked
    }
}
