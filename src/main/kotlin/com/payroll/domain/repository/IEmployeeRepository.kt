package com.payroll.domain.repository

import com.payroll.domain.models.EmployeeDto
import com.payroll.domain.models.PagedData
import com.payroll.domain.models.UpdateEmployeeRequest

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
