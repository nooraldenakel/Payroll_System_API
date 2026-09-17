# Payroll Insight Pro — Enterprise Payroll & Salary Management System

Monorepo containing the isolated REST API backend and the high-fidelity Desktop application.

## Directory Structure

- [`backend/`](./backend): Kotlin 2.1, Ktor 3.0, Koin 4.0, PostgreSQL, JWT Authentication REST API.
- [`desktop/`](./desktop): Standalone Windows Desktop EXE application built with Electron, React, TypeScript, and Tailwind CSS matching the Institutional Ledger design system (Stitch Project `14188803730648610247`).

## Quick Start

### 1. Run the Backend REST API
```bash
cd backend
./gradlew run
```
The API starts on `http://localhost:8080`.

### 2. Run the Desktop App (Development)
```bash
cd desktop
npm install
npm run dev
```

### 3. Windows Executables & Installer Setup
- **Installer Setup EXE**: Run [`Install-Payroll-Insight-Pro.bat`](./Install-Payroll-Insight-Pro.bat) or execute [`Payroll Insight Pro Setup 1.0.0.exe`](./Payroll%20Insight%20Pro%20Setup%201.0.0.exe) in the root directory.
- **Portable Unpacked App**: Run [`Run-Payroll-Insight-Pro.bat`](./Run-Payroll-Insight-Pro.bat) to launch the unpacked desktop application directly.

To rebuild the installer from source at any time:
```bash
cd desktop
npm run build:installer
```
The resulting installer will be generated in `desktop/dist-electron/Payroll Insight Pro Setup 1.0.0.exe`.
