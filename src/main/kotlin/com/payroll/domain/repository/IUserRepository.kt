package com.payroll.domain.repository

import com.payroll.domain.models.PagedData
import com.payroll.domain.models.UpdateUserRequest
import com.payroll.domain.models.UserDto

interface IUserRepository {
    suspend fun getAll(): List<UserDto>
    suspend fun getPaged(page: Int = 1, pageSize: Int = 10): PagedData<UserDto>
    suspend fun findByEmail(email: String): UserDto?
    suspend fun findById(id: String): UserDto?
    suspend fun getPasswordHash(email: String): String?
    suspend fun createUser(id: String, email: String, passwordHash: String, name: String, initials: String, role: String, status: String, avatar: String?): UserDto
    suspend fun updateUser(id: String, req: UpdateUserRequest, passwordHash: String? = null): UserDto?
    suspend fun deleteUser(id: String): Boolean
    suspend fun count(): Long
    suspend fun updateActiveSession(userId: String, sessionId: String?): Boolean
    suspend fun getActiveSession(userId: String): String?
}
