package com.payroll

import com.payroll.data.database.DatabaseFactory
import com.payroll.plugins.*
import com.payroll.security.JwtService
import io.ktor.server.application.*
import io.ktor.server.netty.*
import org.koin.ktor.ext.inject

fun main(args: Array<String>): Unit = EngineMain.main(args)

fun Application.module() {
    DatabaseFactory.init()
    configureKoin()

    val jwtService by inject<JwtService>()
    val userRepo by inject<com.payroll.domain.repository.IUserRepository>()
    configureSecurity(jwtService, userRepo)
    configureSerialization()
    configureHTTP()
    configureRateLimiting()
    configureStatusPages()
    configureRouting()


}
