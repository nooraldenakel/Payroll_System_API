package com.payroll

import com.payroll.domain.models.*
import com.payroll.domain.repository.IAuditLogRepository
import com.payroll.domain.repository.IRefreshTokenRepository
import com.payroll.domain.repository.IUserRepository
import com.payroll.domain.usecase.AuthUseCase
import com.payroll.domain.usecase.ManageUserUseCase
import com.payroll.security.JwtService
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.Test
import org.mindrot.jbcrypt.BCrypt
import java.time.LocalDateTime
import java.util.*
import kotlinx.coroutines.runBlocking

class AuthAndSecurityTest {

    private val jwtService = JwtService()

    private val testUser = UserDto(
        id = "u-test-1",
        email = "auditor@institution.gov",
        name = "Zaid Al-Ali",
        initials = "ZA",
        role = "Auditor",
        status = "Active"
    )

    private val testHashedPassword = BCrypt.hashpw("securePass123!", BCrypt.gensalt(10))

    // In-memory mock repositories for isolated testing
    private val mockUsers = mutableMapOf(testUser.id to testUser)
    private val mockPasswords = mutableMapOf(testUser.email.lowercase() to testHashedPassword)

    private val mockUserRepo = object : IUserRepository {
        override suspend fun getAll(): List<UserDto> = mockUsers.values.toList()

        override suspend fun getPaged(page: Int, pageSize: Int): PagedData<UserDto> {
            val list = mockUsers.values.toList()
            val total = list.size.toLong()
            val totalPages = if (total == 0L) 1 else kotlin.math.ceil(total.toDouble() / pageSize).toInt()
            val offset = ((page - 1) * pageSize)
            val items = list.drop(offset).take(pageSize)
            return PagedData(
                items = items,
                page = page,
                pageSize = pageSize,
                totalItems = total,
                totalPages = totalPages,
                hasNext = page < totalPages,
                hasPrev = page > 1
            )
        }

        override suspend fun findByEmail(email: String): UserDto? =
            mockUsers.values.find { it.email.equals(email, ignoreCase = true) }

        override suspend fun findById(id: String): UserDto? = mockUsers[id]

        override suspend fun getPasswordHash(email: String): String? =
            mockPasswords[email.lowercase()]

        override suspend fun createUser(
            id: String, email: String, passwordHash: String,
            name: String, initials: String, role: String, status: String, avatar: String?
        ): UserDto {
            val user = UserDto(
                id = id,
                email = email,
                name = name,
                initials = initials,
                role = role,
                status = status,
                avatar = avatar
            )
            mockUsers[id] = user
            mockPasswords[email.lowercase()] = passwordHash
            return user
        }

        override suspend fun updateUser(id: String, req: UpdateUserRequest, passwordHash: String?): UserDto? {
            val existing = mockUsers[id] ?: return null
            val updated = existing.copy(
                name = req.name ?: existing.name,
                initials = req.initials ?: existing.initials,
                email = req.email ?: existing.email,
                role = req.role ?: existing.role,
                status = req.status ?: existing.status,
                avatar = req.avatar ?: existing.avatar
            )
            mockUsers[id] = updated
            if (passwordHash != null) {
                mockPasswords[updated.email.lowercase()] = passwordHash
            }
            return updated
        }

        override suspend fun deleteUser(id: String): Boolean {
            val removed = mockUsers.remove(id)
            if (removed != null) {
                mockPasswords.remove(removed.email.lowercase())
                return true
            }
            return false
        }

        override suspend fun count(): Long = mockUsers.size.toLong()

        private val mockActiveSessions = mutableMapOf<String, String>()

        override suspend fun updateActiveSession(userId: String, sessionId: String?): Boolean {
            if (sessionId == null) {
                mockActiveSessions.remove(userId)
            } else {
                mockActiveSessions[userId] = sessionId
            }
            return true
        }

        override suspend fun getActiveSession(userId: String): String? = mockActiveSessions[userId]
    }

    private val mockRefreshTokens = mutableMapOf<String, RefreshTokenDto>()

    private val mockRefreshTokenRepo = object : IRefreshTokenRepository {
        override suspend fun save(
            id: String, userId: String, token: String, expiresAt: LocalDateTime
        ): RefreshTokenDto {
            val dto = RefreshTokenDto(
                id = id,
                userId = userId,
                token = token,
                expiresAt = expiresAt.toString(),
                isRevoked = false,
                createdAt = LocalDateTime.now().toString()
            )
            mockRefreshTokens[token] = dto
            return dto
        }

        override suspend fun findByToken(token: String): RefreshTokenDto? = mockRefreshTokens[token]

        override suspend fun revoke(token: String): Boolean {
            val current = mockRefreshTokens[token] ?: return false
            mockRefreshTokens[token] = current.copy(isRevoked = true)
            return true
        }

        override suspend fun revokeAllForUser(userId: String): Boolean {
            var updated = false
            mockRefreshTokens.forEach { (k, v) ->
                if (v.userId == userId) {
                    mockRefreshTokens[k] = v.copy(isRevoked = true)
                    updated = true
                }
            }
            return updated
        }
    }

    private val mockAuditRepo = object : IAuditLogRepository {
        val logs = mutableListOf<AuditLogEntryDto>()
        override suspend fun getAll(category: String?, limit: Int): List<AuditLogEntryDto> = logs

        override suspend fun getPaged(category: String?, page: Int, pageSize: Int): PagedData<AuditLogEntryDto> {
            val filtered = if (category != null) logs.filter { it.category.equals(category, ignoreCase = true) } else logs
            val total = filtered.size.toLong()
            val totalPages = if (total == 0L) 1 else kotlin.math.ceil(total.toDouble() / pageSize).toInt()
            val offset = ((page - 1) * pageSize)
            val items = filtered.drop(offset).take(pageSize)
            return PagedData(
                items = items,
                page = page,
                pageSize = pageSize,
                totalItems = total,
                totalPages = totalPages,
                hasNext = page < totalPages,
                hasPrev = page > 1
            )
        }

        override suspend fun create(entry: CreateAuditLogRequest): AuditLogEntryDto {
            val log = AuditLogEntryDto(
                id = "LOG-${logs.size + 1}",
                time = LocalDateTime.now().toString(),
                action = entry.action,
                user = entry.user,
                detail = entry.detail,
                icon = entry.icon,
                badgeColor = entry.badgeColor,
                employeeId = entry.employeeId,
                employeeName = entry.employeeName,
                category = entry.category,
                createdAt = LocalDateTime.now().toString()
            )
            logs.add(log)
            return log
        }
    }

    @Test
    fun `jwtService generates 24 hour access token with valid claims`() {
        val token = jwtService.generateAccessToken(testUser)
        assertNotNull(token)

        val decoded = jwtService.verifyToken(token)
        assertNotNull(decoded)
        assertEquals(testUser.id, decoded?.subject)
        assertEquals(testUser.email, decoded?.getClaim("email")?.asString())
        assertEquals(testUser.name, decoded?.getClaim("name")?.asString())
        assertEquals(testUser.role, decoded?.getClaim("role")?.asString())
        assertEquals("access", decoded?.getClaim("type")?.asString())

        // Expiration must be approximately 24 hours from now (within 5 minutes tolerance)
        val expiresAtEpoch = decoded?.expiresAt?.time ?: 0L
        val expectedMin = System.currentTimeMillis() + (23 * 3600 * 1000L)
        val expectedMax = System.currentTimeMillis() + (25 * 3600 * 1000L)
        assertTrue(expiresAtEpoch in expectedMin..expectedMax, "Expiration should be approx 24 hours")
    }

    @Test
    fun `jwtService generates 7 day refresh token`() {
        val (token, expiresAt) = jwtService.generateRefreshToken(testUser)
        assertNotNull(token)
        assertTrue(expiresAt.isAfter(LocalDateTime.now().plusDays(6)))

        val decoded = jwtService.verifyToken(token)
        assertNotNull(decoded)
        assertEquals("refresh", decoded?.getClaim("type")?.asString())
        assertEquals(testUser.id, decoded?.getClaim("userId")?.asString())
    }

    @Test
    fun `authUseCase login succeeds with correct BCrypt credentials and issues both tokens`() = runBlocking {
        val authUseCase = AuthUseCase(mockUserRepo, mockRefreshTokenRepo, jwtService, mockAuditRepo)

        val loginReq = LoginRequest(email = "auditor@institution.gov", password = "securePass123!")
        val loginRes = authUseCase.login(loginReq)

        assertNotNull(loginRes)
        assertEquals(testUser.id, loginRes?.user?.id)
        assertNotNull(loginRes?.accessToken)
        assertNotNull(loginRes?.refreshToken)
        assertEquals(86400L, loginRes?.expiresIn)

        // Verify that refresh token was persisted in repository
        val storedToken = mockRefreshTokenRepo.findByToken(loginRes!!.refreshToken)
        assertNotNull(storedToken)
        assertFalse(storedToken!!.isRevoked)

        // Verify audit log
        assertTrue(mockAuditRepo.logs.any { it.action == "User Login" && it.user == testUser.name })
    }

    @Test
    fun `authUseCase login fails with wrong password`() = runBlocking {
        val authUseCase = AuthUseCase(mockUserRepo, mockRefreshTokenRepo, jwtService, mockAuditRepo)

        val loginReq = LoginRequest(email = "auditor@institution.gov", password = "wrongPassword")
        val loginRes = authUseCase.login(loginReq)

        assertNull(loginRes, "Login should fail on incorrect password")
        assertTrue(mockAuditRepo.logs.any { it.action == "Failed Login" })
    }

    @Test
    fun `authUseCase refresh rotates token and invalidates old refresh token`() = runBlocking {
        val authUseCase = AuthUseCase(mockUserRepo, mockRefreshTokenRepo, jwtService, mockAuditRepo)

        // 1. Initial Login
        val loginRes = authUseCase.login(LoginRequest("auditor@institution.gov", "securePass123!"))
        assertNotNull(loginRes)
        val originalRefreshToken = loginRes!!.refreshToken

        // 2. Perform refresh
        val refreshRes = authUseCase.refreshToken(RefreshTokenRequest(originalRefreshToken))
        assertNotNull(refreshRes, "Refresh should succeed for valid refresh token")
        assertNotNull(refreshRes?.accessToken)
        assertNotNull(refreshRes?.refreshToken)
        assertNotEquals(originalRefreshToken, refreshRes?.refreshToken, "New refresh token should be rotated")

        // 3. Old refresh token must be revoked
        val oldTokenRecord = mockRefreshTokenRepo.findByToken(originalRefreshToken)
        assertNotNull(oldTokenRecord)
        assertTrue(oldTokenRecord!!.isRevoked, "Old refresh token must be marked as revoked")

        // 4. Attempting to refresh again with old revoked token must fail
        val secondRefresh = authUseCase.refreshToken(RefreshTokenRequest(originalRefreshToken))
        assertNull(secondRefresh, "Attempting to refresh with a revoked token must return null")

        // Verify audit log
        assertTrue(mockAuditRepo.logs.any { it.action == "Token Refreshed" })
    }

    @Test
    fun `authUseCase logout revokes user refresh tokens`() = runBlocking {
        val authUseCase = AuthUseCase(mockUserRepo, mockRefreshTokenRepo, jwtService, mockAuditRepo)

        val loginRes = authUseCase.login(LoginRequest("auditor@institution.gov", "securePass123!"))
        val refreshToken = loginRes!!.refreshToken

        val logoutSuccess = authUseCase.logout(userId = testUser.id, refreshToken = refreshToken)
        assertTrue(logoutSuccess)

        val record = mockRefreshTokenRepo.findByToken(refreshToken)
        assertTrue(record!!.isRevoked)

        val refreshAfterLogout = authUseCase.refreshToken(RefreshTokenRequest(refreshToken))
        assertNull(refreshAfterLogout, "Refresh after logout must be rejected")

        // Verify audit log
        assertTrue(mockAuditRepo.logs.any { it.action == "User Logout" })
    }

    @Test
    fun `manageUserUseCase can create, update, and delete users while logging audits`() = runBlocking {
        val manageUserUseCase = ManageUserUseCase(mockUserRepo, mockRefreshTokenRepo, mockAuditRepo)

        // 1. Create User
        val createReq = CreateUserRequest(
            name = "Sarah Finance",
            email = "sarah.finance@institution.gov",
            password = "StrongPassword99!",
            role = "Accountant",
            status = "Active"
        )
        val created = manageUserUseCase.createUser(createReq, operator = "SuperAdmin")
        assertNotNull(created.id)
        assertEquals("sarah.finance@institution.gov", created.email)
        assertEquals("Accountant", created.role)
        assertTrue(mockAuditRepo.logs.any { it.action == "User Provisioned" && it.user == "SuperAdmin" })

        // 2. Update User
        val updateReq = UpdateUserRequest(
            role = "Disburser",
            password = "NewPassword100!"
        )
        val updated = manageUserUseCase.updateUser(created.id, updateReq, operator = "SuperAdmin")
        assertNotNull(updated)
        assertEquals("Disburser", updated?.role)

        // 3. Delete User
        val deleted = manageUserUseCase.deleteUser(created.id, operator = "SuperAdmin")
        assertTrue(deleted)
        assertNull(mockUserRepo.findById(created.id))
        assertTrue(mockAuditRepo.logs.any { it.action == "User Deprovisioned" })
    }

    @Test
    fun `manageUserUseCase prevents duplicate email registration`() = runBlocking {
        val manageUserUseCase = ManageUserUseCase(mockUserRepo, mockRefreshTokenRepo, mockAuditRepo)

        val duplicateReq = CreateUserRequest(
            name = "Zaid Clone",
            email = "auditor@institution.gov",
            password = "password123",
            role = "Auditor"
        )

        val ex = assertThrows<IllegalArgumentException> {
            manageUserUseCase.createUser(duplicateReq, operator = "SuperAdmin")
        }
        assertTrue(ex.message!!.contains("already exists"))
    }

    @Test
    fun `manageUserUseCase and repositories support pagination with default 10 items per page`() = runBlocking {
        val manageUserUseCase = ManageUserUseCase(mockUserRepo, mockRefreshTokenRepo, mockAuditRepo)

        // Populate mock users to test pagination
        for (i in 1..25) {
            mockUserRepo.createUser(
                id = "USER-$i",
                email = "user$i@institution.gov",
                passwordHash = "hash$i",
                name = "Staff Member $i",
                initials = "SM",
                role = "Accountant",
                status = "Active",
                avatar = null
            )
        }

        // Page 1 with pageSize 10
        val page1 = manageUserUseCase.getPaged(page = 1, pageSize = 10)
        assertEquals(1, page1.page)
        assertEquals(10, page1.pageSize)
        assertEquals(10, page1.items.size)
        assertTrue(page1.totalItems >= 25)
        assertTrue(page1.totalPages >= 3)
        assertTrue(page1.hasNext)
        assertFalse(page1.hasPrev)

        // Page 2 with pageSize 10
        val page2 = manageUserUseCase.getPaged(page = 2, pageSize = 10)
        assertEquals(2, page2.page)
        assertEquals(10, page2.pageSize)
        assertEquals(10, page2.items.size)
        assertTrue(page2.hasNext)
        assertTrue(page2.hasPrev)
    }

    @Test
    fun testSingleActiveSessionInvalidatesPreviousDevice() = runBlocking {
        val authUseCase = AuthUseCase(mockUserRepo, mockRefreshTokenRepo, jwtService, mockAuditRepo)
        val user = testUser

        // Device 1 Login
        val loginDevice1 = authUseCase.login(LoginRequest(user.email, "securePass123!"))
        assertNotNull(loginDevice1)
        val session1 = com.payroll.security.SessionManager.getActiveSession(user.id)
        assertNotNull(session1)

        // Verify Device 1 session is currently valid
        assertTrue(com.payroll.security.SessionManager.isSessionValid(user.id, session1, mockUserRepo))

        // Device 2 Login (User signs in from another device/browser)
        val loginDevice2 = authUseCase.login(LoginRequest(user.email, "securePass123!"))
        assertNotNull(loginDevice2)
        val session2 = com.payroll.security.SessionManager.getActiveSession(user.id)
        assertNotNull(session2)
        assertNotEquals(session1, session2)

        // Device 1's old session MUST now be invalid
        assertFalse(com.payroll.security.SessionManager.isSessionValid(user.id, session1, mockUserRepo))

        // Device 2's new session MUST be valid
        assertTrue(com.payroll.security.SessionManager.isSessionValid(user.id, session2, mockUserRepo))

        // Attempting to refresh using Device 1's refresh token MUST be rejected
        val refreshOldDevice = authUseCase.refreshToken(RefreshTokenRequest(loginDevice1!!.refreshToken))
        assertNull(refreshOldDevice)

        // Attempting to refresh using Device 2's refresh token MUST succeed
        val refreshNewDevice = authUseCase.refreshToken(RefreshTokenRequest(loginDevice2!!.refreshToken))
        assertNotNull(refreshNewDevice)
    }
}

