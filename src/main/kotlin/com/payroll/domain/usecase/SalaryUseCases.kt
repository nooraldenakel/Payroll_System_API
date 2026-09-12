package com.payroll.domain.usecase

import com.payroll.domain.models.*
import com.payroll.domain.repository.*
import com.payroll.security.JwtService
import com.payroll.security.SessionManager
import org.mindrot.jbcrypt.BCrypt
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

class CalculateSalaryUseCase(
    private val settingsRepo: ISettingsRepository
) {
    suspend fun calculate(
        baseSalary: Double,
        bonus: Double = 0.0,
        insurance: Double = 0.0,
        absenceDeduction: Double = 0.0,
        recruitmentFee: Double? = null,
        searchingDocFee: Double? = null,
        isForeign: Boolean = false
    ): Triple<Double, Double, Double?> {
        val settings = settingsRepo.get()
        val usdRate = settings.usdToDinarRate

        val safeRecruitment = recruitmentFee ?: 0.0
        val safeSearchFee = searchingDocFee ?: 0.0

        val totalDeductions = safeRecruitment + insurance + absenceDeduction + safeSearchFee
        val rawNet = (baseSalary - safeRecruitment) + bonus - insurance - absenceDeduction - safeSearchFee
        val netSalary = maxOf(0.0, rawNet)

        val feeIqd = if (isForeign && safeSearchFee > 0.0) {
            Math.round(safeSearchFee * usdRate).toDouble()
        } else {
            null
        }

        return Triple(netSalary, totalDeductions, feeIqd)
    }
}

class RecalculatePeriodStatsUseCase(
    private val periodRepo: IPeriodRepository,
    private val employeeRepo: IEmployeeRepository
) {
    suspend fun execute(periodId: String) {
        val employees = employeeRepo.getAll(periodId = periodId)
        val count = employees.size
        val totalPayroll = employees.sumOf { it.netSalary }
        val paidAmount = employees.filter { it.salaryState.equals("Paid", ignoreCase = true) }.sumOf { it.netSalary }
        val remainingAmount = maxOf(0.0, totalPayroll - paidAmount)
        val processedCount = employees.count { it.salaryState.equals("Paid", ignoreCase = true) }

        periodRepo.updateAggregates(
            id = periodId,
            employeesCount = count,
            totalPayroll = totalPayroll,
            paidAmount = paidAmount,
            remainingAmount = remainingAmount,
            processedCount = processedCount
        )
    }
}

class ManageEmployeeUseCase(
    private val employeeRepo: IEmployeeRepository,
    private val periodRepo: IPeriodRepository,
    private val auditRepo: IAuditLogRepository,
    private val calcUseCase: CalculateSalaryUseCase,
    private val recalculatePeriodStats: RecalculatePeriodStatsUseCase
) {
    suspend fun createEmployee(req: CreateEmployeeRequest, operator: String = "System"): EmployeeDto {
        val id = req.id?.takeIf { it.isNotBlank() } ?: "EMP-${(1000..9999).random()}"
        val initials = req.initials?.takeIf { it.isNotBlank() }
            ?: req.name.split(" ").filter { it.isNotBlank() }.map { it.first() }.take(2).joinToString("").uppercase().ifBlank { "EM" }

        val (netSalary, deductions, feeIqd) = calcUseCase.calculate(
            baseSalary = req.baseSalary,
            bonus = req.bonus,
            insurance = req.insurance,
            absenceDeduction = req.absenceDeduction,
            recruitmentFee = req.recruitmentFee,
            searchingDocFee = req.searchingDocFee,
            isForeign = req.isForeign
        )

        val currency = req.currency?.takeIf { it.isNotBlank() } ?: (if (req.isForeign) "USD" else "Dinar")
        val joinDate = req.joinDate?.takeIf { it.isNotBlank() } ?: LocalDateTime.now().toLocalDate().toString()
        val paymentStatus = if (req.salaryState.equals("Paid", ignoreCase = true)) "Paid" else "Unpaid"
        val paidAt = if (paymentStatus == "Paid") LocalDateTime.now().toString() else req.paidAt

        val employee = EmployeeDto(
            id = id,
            periodId = req.periodId,
            name = req.name,
            initials = initials,
            avatar = req.avatar,
            type = req.type,
            department = req.department,
            baseSalary = req.baseSalary,
            bonus = req.bonus,
            insurance = req.insurance,
            absenceDays = req.absenceDays,
            absenceDeduction = req.absenceDeduction,
            searchingDocFee = req.searchingDocFee,
            searchingDocFeeIqd = feeIqd,
            isForeign = req.isForeign,
            currency = currency,
            hasRecruitmentFee = req.hasRecruitmentFee,
            recruitmentFee = req.recruitmentFee,
            deductions = deductions,
            netSalary = netSalary,
            salaryState = req.salaryState,
            paidAt = paidAt,
            status = req.status,
            email = req.email ?: "",
            phone = req.phone ?: "",
            joinDate = joinDate,
            paymentStatus = paymentStatus,
            createdAt = LocalDateTime.now().toString()
        )

        val created = employeeRepo.create(employee)
        recalculatePeriodStats.execute(req.periodId)

        auditRepo.create(
            CreateAuditLogRequest(
                action = "Employee Enrolled",
                user = operator,
                detail = "Enrolled ${created.name} (${created.id}) in ${created.department} with net salary ${created.netSalary} ${created.currency}",
                icon = "person_add",
                badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-200",
                employeeId = created.id,
                employeeName = created.name,
                category = "Employee"
            )
        )

        return created
    }

    suspend fun updateEmployee(id: String, req: UpdateEmployeeRequest, operator: String = "System"): EmployeeDto? {
        val current = employeeRepo.getById(id) ?: return null

        val baseSalary = req.baseSalary ?: current.baseSalary
        val bonus = req.bonus ?: current.bonus
        val insurance = req.insurance ?: current.insurance
        val absenceDeduction = req.absenceDeduction ?: current.absenceDeduction
        val recruitmentFee = req.recruitmentFee ?: current.recruitmentFee
        val searchingDocFee = req.searchingDocFee ?: current.searchingDocFee
        val isForeign = req.isForeign ?: current.isForeign

        val (netSalary, deductions, feeIqd) = calcUseCase.calculate(
            baseSalary = baseSalary,
            bonus = bonus,
            insurance = insurance,
            absenceDeduction = absenceDeduction,
            recruitmentFee = recruitmentFee,
            searchingDocFee = searchingDocFee,
            isForeign = isForeign
        )

        val updated = employeeRepo.update(
            id = id,
            updates = req,
            calculatedNetSalary = netSalary,
            calculatedDeductions = deductions,
            calculatedFeeIqd = feeIqd
        )

        if (updated != null) {
            recalculatePeriodStats.execute(updated.periodId)
            auditRepo.create(
                CreateAuditLogRequest(
                    action = "Employee Updated",
                    user = operator,
                    detail = "Updated payroll details for ${updated.name} (${updated.id}). New net: ${updated.netSalary}",
                    icon = "edit",
                    badgeColor = "bg-blue-50 text-blue-700 border border-blue-200",
                    employeeId = updated.id,
                    employeeName = updated.name,
                    category = "Salary"
                )
            )
        }

        return updated
    }

    suspend fun toggleSalaryPayment(id: String, nextStateInput: String?, operator: String = "System"): EmployeeDto? {
        val current = employeeRepo.getById(id) ?: return null

        val nextState = when (nextStateInput?.lowercase()) {
            "paid" -> "Paid"
            "stopped" -> "Stopped"
            "not yet", "unpaid" -> "Not Yet"
            else -> if (current.salaryState.equals("Paid", ignoreCase = true)) "Not Yet" else "Paid"
        }

        val paidAt = if (nextState == "Paid") LocalDateTime.now().toString() else null
        val updated = employeeRepo.updatePaymentState(id, nextState, paidAt)

        if (updated != null) {
            recalculatePeriodStats.execute(updated.periodId)
            auditRepo.create(
                CreateAuditLogRequest(
                    action = if (nextState == "Paid") "Salary Disbursed" else "Salary Payment Updated",
                    user = operator,
                    detail = "Payment status for ${updated.name} changed to '$nextState' (Net: ${updated.netSalary} ${updated.currency})",
                    icon = if (nextState == "Paid") "check_circle" else "history",
                    badgeColor = if (nextState == "Paid") "bg-emerald-50 text-emerald-700 border border-emerald-200" else "bg-amber-50 text-amber-700 border border-amber-200",
                    employeeId = updated.id,
                    employeeName = updated.name,
                    category = "Salary"
                )
            )
        }

        return updated
    }

    suspend fun deleteEmployee(id: String, operator: String = "System"): Boolean {
        val current = employeeRepo.getById(id) ?: return false
        val success = employeeRepo.delete(id)
        if (success) {
            recalculatePeriodStats.execute(current.periodId)
            auditRepo.create(
                CreateAuditLogRequest(
                    action = "Employee Terminated",
                    user = operator,
                    detail = "Deleted record for ${current.name} (${current.id}) from period ${current.periodId}",
                    icon = "delete",
                    badgeColor = "bg-rose-50 text-rose-700 border border-rose-200",
                    employeeId = current.id,
                    employeeName = current.name,
                    category = "Employee"
                )
            )
        }
        return success
    }
}

class ReportAnalyticsUseCase(
    private val periodRepo: IPeriodRepository,
    private val employeeRepo: IEmployeeRepository,
    private val settingsRepo: ISettingsRepository
) {
    suspend fun getSummary(periodId: String): PayrollSummaryDto? {
        val period = periodRepo.getById(periodId) ?: return null
        val employees = employeeRepo.getAll(periodId = periodId)

        val totalEmployees = employees.size
        val paidEmployees = employees.count { it.salaryState.equals("Paid", ignoreCase = true) }
        val stoppedEmployees = employees.count { it.salaryState.equals("Stopped", ignoreCase = true) }
        val pendingEmployees = totalEmployees - paidEmployees - stoppedEmployees

        val totalPayroll = employees.sumOf { it.netSalary }
        val paidAmount = employees.filter { it.salaryState.equals("Paid", ignoreCase = true) }.sumOf { it.netSalary }
        val remainingAmount = maxOf(0.0, totalPayroll - paidAmount)
        val completionRate = if (totalPayroll > 0) (paidAmount / totalPayroll) * 100.0 else 0.0

        val totalSearchFeeIqd = employees.filter { !it.isForeign }.sumOf { it.searchingDocFee ?: 0.0 }
        val totalSearchFeeUsd = employees.filter { it.isForeign }.sumOf { it.searchingDocFee ?: 0.0 }
        val totalRecruitmentFee = employees.sumOf { it.recruitmentFee ?: 0.0 }
        val totalAbsenceDeductions = employees.sumOf { it.absenceDeduction }

        return PayrollSummaryDto(
            periodId = period.id,
            periodName = period.name,
            totalEmployees = totalEmployees,
            paidEmployees = paidEmployees,
            pendingEmployees = pendingEmployees,
            stoppedEmployees = stoppedEmployees,
            totalPayroll = totalPayroll,
            paidAmount = paidAmount,
            remainingAmount = remainingAmount,
            completionRate = completionRate,
            totalSearchFeeIqd = totalSearchFeeIqd,
            totalSearchFeeUsd = totalSearchFeeUsd,
            totalRecruitmentFee = totalRecruitmentFee,
            totalAbsenceDeductions = totalAbsenceDeductions
        )
    }

    suspend fun getDepartmentBreakdown(periodId: String): List<DepartmentExpenseDto> {
        val employees = employeeRepo.getAll(periodId = periodId)
        val totalPayrollAll = employees.sumOf { it.netSalary }

        val groups = employees.groupBy { it.department }
        return groups.map { (dept, list) ->
            val totalPayroll = list.sumOf { it.netSalary }
            val avg = if (list.isNotEmpty()) totalPayroll / list.size else 0.0
            val pct = if (totalPayrollAll > 0) (totalPayroll / totalPayrollAll) * 100.0 else 0.0
            DepartmentExpenseDto(
                department = dept,
                headcount = list.size,
                totalPayroll = totalPayroll,
                averageSalary = avg,
                percentage = pct
            )
        }.sortedByDescending { it.totalPayroll }
    }

    suspend fun getCurrencyBreakdown(periodId: String): CurrencyBreakdownDto {
        val employees = employeeRepo.getAll(periodId = periodId)
        val settings = settingsRepo.get()
        val usdRate = settings.usdToDinarRate

        val localEmployees = employees.filter { !it.isForeign }
        val foreignEmployees = employees.filter { it.isForeign }

        val localPayrollIqd = localEmployees.sumOf { it.netSalary }
        val foreignPayrollUsd = foreignEmployees.sumOf { it.netSalary }
        val foreignPayrollIqdEquiv = foreignPayrollUsd * usdRate
        val totalPayrollIqdCombined = localPayrollIqd + foreignPayrollIqdEquiv

        return CurrencyBreakdownDto(
            localEmployeesCount = localEmployees.size,
            foreignEmployeesCount = foreignEmployees.size,
            localPayrollIqd = localPayrollIqd,
            foreignPayrollUsd = foreignPayrollUsd,
            foreignPayrollIqdEquiv = foreignPayrollIqdEquiv,
            totalPayrollIqdCombined = totalPayrollIqdCombined,
            usdExchangeRate = usdRate
        )
    }
}

class AuthUseCase(
    private val userRepo: IUserRepository,
    private val refreshTokenRepo: IRefreshTokenRepository,
    private val jwtService: JwtService,
    private val auditRepo: IAuditLogRepository
) {
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

class ManageUserUseCase(
    private val userRepo: IUserRepository,
    private val refreshTokenRepo: IRefreshTokenRepository,
    private val auditRepo: IAuditLogRepository
) {
    suspend fun getAll(): List<UserDto> = userRepo.getAll()
    suspend fun getPaged(page: Int = 1, pageSize: Int = 10): PagedData<UserDto> = userRepo.getPaged(page, pageSize)

    suspend fun getById(id: String): UserDto? = userRepo.findById(id)

    suspend fun createUser(req: CreateUserRequest, operator: String = "System"): UserDto {
        require(req.email.isNotBlank()) { "User email is required" }
        require(req.password.isNotBlank()) { "User password is required" }
        require(req.name.isNotBlank()) { "User name is required" }

        val normalizedEmail = req.email.trim().lowercase()
        if (userRepo.findByEmail(normalizedEmail) != null) {
            throw IllegalArgumentException("User with email '$normalizedEmail' already exists")
        }

        val id = "USR-${UUID.randomUUID().toString().take(8).uppercase()}"
        val initials = req.initials?.takeIf { it.isNotBlank() }
            ?: req.name.split(" ").filter { it.isNotBlank() }.map { it.first() }.take(2).joinToString("").uppercase().ifBlank { "US" }
        val role = req.role.takeIf { it.isNotBlank() } ?: "Accountant"
        val status = req.status.takeIf { it.isNotBlank() } ?: "Active"
        val passwordHash = BCrypt.hashpw(req.password, BCrypt.gensalt(10))

        val created = userRepo.createUser(
            id = id,
            email = normalizedEmail,
            passwordHash = passwordHash,
            name = req.name.trim(),
            initials = initials,
            role = role,
            status = status,
            avatar = req.avatar
        )

        auditRepo.create(
            CreateAuditLogRequest(
                action = "User Provisioned",
                user = operator,
                detail = "Created staff user account for ${created.name} (${created.email}) with role ${created.role}",
                icon = "person_add",
                badgeColor = "bg-blue-50 text-blue-700 border border-blue-200",
                employeeId = created.id,
                employeeName = created.name,
                category = "Security"
            )
        )

        return created
    }

    suspend fun updateUser(id: String, req: UpdateUserRequest, operator: String = "System"): UserDto? {
        val existing = userRepo.findById(id) ?: return null

        if (!req.email.isNullOrBlank()) {
            val normalizedEmail = req.email.trim().lowercase()
            val existingByEmail = userRepo.findByEmail(normalizedEmail)
            if (existingByEmail != null && existingByEmail.id != id) {
                throw IllegalArgumentException("Email '$normalizedEmail' is already in use by another user")
            }
        }

        val newPasswordHash = if (!req.password.isNullOrBlank()) {
            BCrypt.hashpw(req.password, BCrypt.gensalt(10))
        } else {
            null
        }

        val updated = userRepo.updateUser(id, req, newPasswordHash) ?: return null

        // If password was changed or status set to inactive, invalidate active sessions
        if (newPasswordHash != null || (req.status != null && !req.status.equals("Active", ignoreCase = true))) {
            refreshTokenRepo.revokeAllForUser(id)
        }

        auditRepo.create(
            CreateAuditLogRequest(
                action = "User Profile Updated",
                user = operator,
                detail = "Updated user profile for ${updated.name} (${updated.email}). Role: ${req.role ?: "unchanged"}, Status: ${req.status ?: "unchanged"}, PasswordReset: ${newPasswordHash != null}",
                icon = "manage_accounts",
                badgeColor = "bg-amber-50 text-amber-700 border border-amber-200",
                employeeId = updated.id,
                employeeName = updated.name,
                category = "Security"
            )
        )

        return updated
    }

    suspend fun deleteUser(id: String, operator: String = "System"): Boolean {
        val existing = userRepo.findById(id) ?: return false

        refreshTokenRepo.revokeAllForUser(id)
        val deleted = userRepo.deleteUser(id)

        if (deleted) {
            auditRepo.create(
                CreateAuditLogRequest(
                    action = "User Deprovisioned",
                    user = operator,
                    detail = "Terminated user account ${existing.name} (${existing.email}) and revoked active sessions",
                    icon = "person_remove",
                    badgeColor = "bg-rose-50 text-rose-700 border border-rose-200",
                    employeeId = existing.id,
                    employeeName = existing.name,
                    category = "Security"
                )
            )
        }

        return deleted
    }
}

