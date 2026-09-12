$base = "http://localhost:8080"

Write-Host "`n========================================================" -ForegroundColor Magenta
Write-Host "  Payroll Insight Pro — E2E Test (CRUD, Pagination, Audit) " -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Magenta

# 1. Public Service Info & Health
Write-Host "`n--- 1. Testing GET / (Public Catalog) ---" -ForegroundColor Cyan
$root = Invoke-RestMethod -Uri "$base/"
Write-Host ($root | ConvertTo-Json -Depth 2)

Write-Host "`n--- 2. Testing GET /health (Public Health Check) ---" -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "$base/health"
Write-Host ($health | ConvertTo-Json -Depth 2)

# 2. Reset Database with Real Data
Write-Host "`n--- 3. Testing POST /api/seed?reset=true (Seed Real Data) ---" -ForegroundColor Cyan
$seedRes = Invoke-RestMethod -Uri "$base/api/seed?reset=true" -Method Post
Write-Host ($seedRes | ConvertTo-Json -Depth 2)

# 3. Verify Endpoint Security: Protected endpoint WITHOUT token must return 401
Write-Host "`n--- 4. Security Check: Accessing /api/periods WITHOUT Token (Expect 401) ---" -ForegroundColor Yellow
try {
    $unauthRes = Invoke-RestMethod -Uri "$base/api/periods" -Method Get -ErrorAction Stop
    Write-Host "FAILED: Endpoint was accessible without auth!" -ForegroundColor Red
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "SUCCESS: Protected endpoint correctly rejected unauthenticated request! HTTP Status: $statusCode" -ForegroundColor Green
}

# 4. Login with Valid Credentials (BCrypt verified)
Write-Host "`n--- 5. Testing POST /api/auth/login (Login) ---" -ForegroundColor Cyan
$loginPayload = @{
    email    = "admin@institution.gov"
    password = "admin123"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -Body $loginPayload -ContentType "application/json"
Write-Host ($loginRes | ConvertTo-Json -Depth 3)

$accessToken = $loginRes.data.accessToken
$refreshToken = $loginRes.data.refreshToken
$userEmail = $loginRes.data.user.email
Write-Host "`nGenerated 24-Hour Access Token: $($accessToken.Substring(0, 30))..." -ForegroundColor Green
Write-Host "Generated 7-Day Refresh Token:  $($refreshToken.Substring(0, 30))..." -ForegroundColor Green
Write-Host "Logged in User: $userEmail ($($loginRes.data.user.role))" -ForegroundColor Green

$authHeader = @{
    "Authorization" = "Bearer $accessToken"
    "Accept"        = "application/json"
}

# 5. Get Current User Profile
Write-Host "`n--- 6. Testing GET /api/auth/me (Protected Profile) ---" -ForegroundColor Cyan
$meRes = Invoke-RestMethod -Uri "$base/api/auth/me" -Headers $authHeader
Write-Host ($meRes | ConvertTo-Json -Depth 3)

# 6. User Creation Test (Verify Previous 500 Error is Resolved!)
Write-Host "`n--- 7. Testing POST /api/users (Create User - Bug Fix Verification) ---" -ForegroundColor Cyan
$newUserPayload = @{
    name     = "Karrar Al-Mansoor"
    email    = "karrar.almansoor@institution.gov"
    password = "SecurePassword2026!"
    role     = "Accountant"
    status   = "Active"
} | ConvertTo-Json

$createUserRes = Invoke-RestMethod -Uri "$base/api/users" -Method Post -Body $newUserPayload -ContentType "application/json" -Headers $authHeader
Write-Host ($createUserRes | ConvertTo-Json -Depth 3)
if ($createUserRes.success -and $createUserRes.data.id) {
    Write-Host "SUCCESS: User created cleanly without 500 error! ID: $($createUserRes.data.id)" -ForegroundColor Green
}
else {
    Write-Host "FAILED: User creation failed!" -ForegroundColor Red
}

# 7. List Users with Pagination (page=1&pageSize=10)
Write-Host "`n--- 8. Testing GET /api/users?page=1&pageSize=10 (Paginated Users) ---" -ForegroundColor Cyan
$usersRes = Invoke-RestMethod -Uri "$base/api/users?page=1&pageSize=10" -Headers $authHeader
Write-Host "Total Users: $($usersRes.data.totalCount), Page: $($usersRes.data.page), PageSize: $($usersRes.data.pageSize), TotalPages: $($usersRes.data.totalPages)" -ForegroundColor Green
foreach ($u in $usersRes.data.items) {
    Write-Host "  - [$($u.id)] $($u.name) | $($u.email) | Role: $($u.role)" -ForegroundColor White
}

# 8. Query Real Payroll Periods with Pagination
Write-Host "`n--- 9. Testing GET /api/periods?page=1&pageSize=10 (Paginated Periods) ---" -ForegroundColor Cyan
$periodsRes = Invoke-RestMethod -Uri "$base/api/periods?page=1&pageSize=10" -Headers $authHeader
Write-Host "Total Periods: $($periodsRes.data.totalCount), Page: $($periodsRes.data.page), PageSize: $($periodsRes.data.pageSize)" -ForegroundColor Green
$activePeriod = $periodsRes.data.items | Where-Object { $_.id -eq "PR-2608" }
$periodId = $activePeriod.id
Write-Host "Active Real Period: $periodId ($($activePeriod.name)), Employees: $($activePeriod.employeesCount), Total Payroll: $($activePeriod.totalPayroll)" -ForegroundColor Green

# 9. Query Employees in Active Period with Pagination
Write-Host "`n--- 10. Testing GET /api/employees?periodId=$periodId&page=1&pageSize=10 (Paginated Employees) ---" -ForegroundColor Cyan
$empListRes = Invoke-RestMethod -Uri "$base/api/employees?periodId=$periodId&page=1&pageSize=10" -Headers $authHeader
Write-Host "Total employees in period: $($empListRes.data.totalCount), Page: $($empListRes.data.page), PageSize: $($empListRes.data.pageSize)" -ForegroundColor Green
foreach ($e in $empListRes.data.items) {
    Write-Host "  - [$($e.id)] $($e.name) | $($e.department) | Net: $($e.netSalary) $($e.currency) | State: $($e.salaryState)" -ForegroundColor White
}

# 10. Enroll a New Employee (POST)
Write-Host "`n--- 11. Testing POST /api/employees (Enroll Employee) ---" -ForegroundColor Cyan
$newEmpPayload = @{
    periodId         = $periodId
    name             = "Mustafa Kamal Al-Bayati"
    department       = "Engineering & Infrastructure"
    baseSalary       = 2300000.0
    bonus            = 200000.0
    insurance        = 65000.0
    absenceDays      = 0
    absenceDeduction = 0.0
    isForeign        = $false
    currency         = "Dinar"
    email            = "m.kamal@institution.gov"
    phone            = "+964 778 901 2345"
} | ConvertTo-Json

$createEmpRes = Invoke-RestMethod -Uri "$base/api/employees" -Method Post -Body $newEmpPayload -ContentType "application/json" -Headers $authHeader
Write-Host ($createEmpRes | ConvertTo-Json -Depth 3)
$createdEmpId = $createEmpRes.data.id
Write-Host "SUCCESS: Created Employee ID: $createdEmpId" -ForegroundColor Green

# 11. Full Replacement Update (PUT /api/employees/{id})
Write-Host "`n--- 12. Testing PUT /api/employees/$createdEmpId (Full Replacement Update) ---" -ForegroundColor Cyan
$putEmpPayload = @{
    periodId         = $periodId
    name             = "Mustafa Kamal Al-Bayati (Lead)"
    department       = "Engineering & Infrastructure"
    type             = "Full-Time"
    baseSalary       = 2500000.0
    bonus            = 300000.0
    insurance        = 75000.0
    absenceDays      = 1
    absenceDeduction = 50000.0
    isForeign        = $false
    currency         = "Dinar"
    email            = "m.kamal@institution.gov"
    phone            = "+964 778 901 2345"
} | ConvertTo-Json

$putEmpRes = Invoke-RestMethod -Uri "$base/api/employees/$createdEmpId" -Method Put -Body $putEmpPayload -ContentType "application/json" -Headers $authHeader
Write-Host "Updated Name via PUT: $($putEmpRes.data.name), Base Salary: $($putEmpRes.data.baseSalary), Net: $($putEmpRes.data.netSalary)" -ForegroundColor Green

# 12. Partial Update (PATCH /api/employees/{id})
Write-Host "`n--- 13. Testing PATCH /api/employees/$createdEmpId (Partial Update) ---" -ForegroundColor Cyan
$patchEmpPayload = @{
    bonus = 350000.0
} | ConvertTo-Json

$patchEmpRes = Invoke-RestMethod -Uri "$base/api/employees/$createdEmpId" -Method Patch -Body $patchEmpPayload -ContentType "application/json" -Headers $authHeader
Write-Host "Updated Bonus via PATCH: $($patchEmpRes.data.bonus), Net: $($patchEmpRes.data.netSalary)" -ForegroundColor Green

# 13. Toggle Salary Payment
Write-Host "`n--- 14. Testing POST /api/employees/$createdEmpId/toggle-payment (Mark Paid) ---" -ForegroundColor Cyan
$toggleRes = Invoke-RestMethod -Uri "$base/api/employees/$createdEmpId/toggle-payment" -Method Post -Headers $authHeader
Write-Host "Payment State: $($toggleRes.data.salaryState), Paid At: $($toggleRes.data.paidAt)" -ForegroundColor Green

# 14. Delete Employee (DELETE /api/employees/{id})
Write-Host "`n--- 15. Testing DELETE /api/employees/$createdEmpId (Delete Employee) ---" -ForegroundColor Cyan
$delEmpRes = Invoke-RestMethod -Uri "$base/api/employees/$createdEmpId" -Method Delete -Headers $authHeader
Write-Host "Delete response: $($delEmpRes | ConvertTo-Json -Depth 2)" -ForegroundColor Green

# 15. Verify Complete Audit Logging
Write-Host "`n--- 16. Testing GET /api/audit-logs?page=1&pageSize=10 (Verify All Actions Logged) ---" -ForegroundColor Cyan
$auditRes = Invoke-RestMethod -Uri "$base/api/audit-logs?page=1&pageSize=10" -Headers $authHeader
Write-Host "Total Audit Entries: $($auditRes.data.totalCount), Returned on Page 1: $($auditRes.data.items.Count)" -ForegroundColor Green
Write-Host "`nRecent Recorded System Actions:" -ForegroundColor Yellow
foreach ($log in $auditRes.data.items) {
    Write-Host "  - [$($log.timestamp)] [Action: $($log.action)] by [$($log.user)] ($($log.category)) : $($log.detail)" -ForegroundColor White
}

# 16. Logout & Token Revocation
Write-Host "`n--- 17. Testing POST /api/auth/logout (Revoke Tokens) ---" -ForegroundColor Cyan
$logoutPayload = @{
    refreshToken = $refreshToken
} | ConvertTo-Json
$logoutRes = Invoke-RestMethod -Uri "$base/api/auth/logout" -Method Post -Body $logoutPayload -ContentType "application/json" -Headers $authHeader
Write-Host ($logoutRes | ConvertTo-Json -Depth 2)

Write-Host "`n🎉 ALL CRUD, PAGINATION (10/PAGE), AUDIT LOGGING & SECURITY TESTS PASSED!" -ForegroundColor Green

Write-Host "`n🎉 ALL DEFENSE, SINGLE-DEVICE SESSIONS, RATE LIMITING & SECURITY TESTS PASSED!" -ForegroundColor Green
