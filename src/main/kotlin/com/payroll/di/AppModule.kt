package com.payroll.di

import com.payroll.data.excel.ExcelParser
import com.payroll.data.repository.*
import com.payroll.domain.repository.*
import com.payroll.domain.usecase.*
import com.payroll.security.JwtService
import org.koin.dsl.module

val coreModule = module {
    single { JwtService(getOrNull()) }
    single { ExcelParser() }
}

val repositoryModule = module {
    single<IUserRepository> { UserRepositoryImpl() }
    single<IPeriodRepository> { PeriodRepositoryImpl() }
    single<IEmployeeRepository> { EmployeeRepositoryImpl() }
    single<IAuditLogRepository> { AuditLogRepositoryImpl() }
    single<IImportRepository> { ImportRepositoryImpl() }
    single<ISettingsRepository> { SettingsRepositoryImpl() }
    single<IRefreshTokenRepository> { RefreshTokenRepositoryImpl() }
}

val useCaseModule = module {
    single { CalculateSalaryUseCase(settingsRepo = get()) }
    single { RecalculatePeriodStatsUseCase(periodRepo = get(), employeeRepo = get()) }
    single {
        ManageEmployeeUseCase(
            employeeRepo = get(),
            periodRepo = get(),
            auditRepo = get(),
            calcUseCase = get(),
            recalculatePeriodStats = get()
        )
    }
    single {
        ReportAnalyticsUseCase(
            periodRepo = get(),
            employeeRepo = get(),
            settingsRepo = get()
        )
    }
    single {
        AuthUseCase(
            userRepo = get(),
            refreshTokenRepo = get(),
            jwtService = get(),
            auditRepo = get()
        )
    }
    single {
        ManageUserUseCase(
            userRepo = get(),
            refreshTokenRepo = get(),
            auditRepo = get()
        )
    }
}

val appModules = listOf(coreModule, repositoryModule, useCaseModule)
