package com.payroll.domain.usecase

import com.payroll.domain.models.*
import com.payroll.domain.repository.IAuditLogRepository
import com.payroll.domain.repository.IRefreshTokenRepository
import com.payroll.domain.repository.IUserRepository
import org.mindrot.jbcrypt.BCrypt
import java.util.UUID

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
