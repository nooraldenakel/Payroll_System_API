package com.payroll.security

import com.payroll.domain.repository.IUserRepository
import java.util.concurrent.ConcurrentHashMap

/**
 * Thread-safe singleton managing single-device active sessions.
 * When a user logs in from another device, the previous session is immediately revoked.
 */
object SessionManager {
    private val activeSessions = ConcurrentHashMap<String, String>()

    /**
     * Stores or replaces the active sessionId for the given user.
     */
    fun setActiveSession(userId: String, sessionId: String) {
        activeSessions[userId] = sessionId
    }

    /**
     * Invalidates any active session for the given user (e.g. on logout).
     */
    fun invalidateSession(userId: String) {
        activeSessions.remove(userId)
    }

    /**
     * Gets current active session from cache.
     */
    fun getActiveSession(userId: String): String? {
        return activeSessions[userId]
    }

    /**
     * Verifies if a given token's sessionId matches the user's active session.
     * Checks in-memory cache first; falls back to DB if cache is cold (e.g. after server restart).
     */
    suspend fun isSessionValid(userId: String, sessionId: String?, userRepo: IUserRepository? = null): Boolean {
        if (sessionId.isNullOrBlank()) return false

        val cachedSession = activeSessions[userId]
        if (cachedSession != null) {
            return cachedSession == sessionId
        }

        // Cache miss: check database
        if (userRepo != null) {
            val dbSession = userRepo.getActiveSession(userId)
            if (dbSession != null) {
                activeSessions[userId] = dbSession
                return dbSession == sessionId
            }
        }

        return false
    }
}
