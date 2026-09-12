package com.payroll.domain.repository

import com.payroll.domain.models.CreatePeriodRequest
import com.payroll.domain.models.PagedData
import com.payroll.domain.models.PayrollPeriodDto
import com.payroll.domain.models.UpdatePeriodRequest

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
