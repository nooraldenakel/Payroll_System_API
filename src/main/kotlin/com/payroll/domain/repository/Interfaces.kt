package com.payroll.domain.repository

import com.payroll.domain.models.*

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

interface IPeriodRepository {
    suspend fun getAll(): List<PayrollPeriodDto>
    suspend fun getPaged(page: Int = 1, pageSize: Int = 10): PagedData<PayrollPeriodDto>
    suspend fun getById(id: String): PayrollPeriodDto?
    suspend fun create(request: CreatePeriodRequest): PayrollPeriodDto
    suspend fun update(id: String, request: UpdatePeriodRequest): PayrollPeriodDto?
    suspend fun delete(id: String): Boolean
    suspend fun updateAggregates(id: String, employeesCount: Int, totalPayroll: Double, paidAmount: Double, remainingAmount: Double, processedCount: Int): Boolean
    suspend fun count(): Long
}

interface IEmployeeRepository {
    suspend fun getAll(periodId: String? = null, department: String? = null, salaryState: String? = null, search: String? = null): List<EmployeeDto>
    suspend fun getPaged(periodId: String? = null, department: String? = null, salaryState: String? = null, search: String? = null, page: Int = 1, pageSize: Int = 10): PagedData<EmployeeDto>
    suspend fun getById(id: String): EmployeeDto?
    suspend fun create(employee: EmployeeDto): EmployeeDto
    suspend fun update(id: String, updates: UpdateEmployeeRequest, calculatedNetSalary: Double, calculatedDeductions: Double, calculatedFeeIqd: Double?): EmployeeDto?
    suspend fun updatePaymentState(id: String, nextState: String, paidAt: String?): EmployeeDto?
    suspend fun delete(id: String): Boolean
    suspend fun batchCreate(employees: List<EmployeeDto>): Int
    suspend fun count(periodId: String? = null): Long
}

interface IAuditLogRepository {
    suspend fun getAll(category: String? = null, limit: Int = 100): List<AuditLogEntryDto>
    suspend fun getPaged(category: String? = null, page: Int = 1, pageSize: Int = 10): PagedData<AuditLogEntryDto>
    suspend fun create(entry: CreateAuditLogRequest): AuditLogEntryDto
}

interface IImportRepository {
    suspend fun getAll(): List<ExcelImportRecordDto>
    suspend fun getPaged(page: Int = 1, pageSize: Int = 10): PagedData<ExcelImportRecordDto>
    suspend fun create(request: CreateImportRecordRequest): ExcelImportRecordDto
    suspend fun delete(id: String? = null): Boolean
}

interface ISettingsRepository {
    suspend fun get(): SystemSettingsDto
    suspend fun update(updates: UpdateSettingsRequest): SystemSettingsDto
    suspend fun getColumns(): List<ColumnConfigDto>
    suspend fun updateColumns(columns: List<ColumnConfigDto>): List<ColumnConfigDto>
}

interface IRefreshTokenRepository {
    suspend fun save(id: String, userId: String, token: String, expiresAt: java.time.LocalDateTime): RefreshTokenDto
    suspend fun findByToken(token: String): RefreshTokenDto?
    suspend fun revoke(token: String): Boolean
    suspend fun revokeAllForUser(userId: String): Boolean
}
