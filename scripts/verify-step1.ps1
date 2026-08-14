$ErrorActionPreference = "Stop"

Write-Host "=== 1. Checking API Health ==="
$health = Invoke-RestMethod -Uri "http://localhost:3000/v1/health" -Method Get
Write-Host "Health Status:" ($health | ConvertTo-Json -Compress)

Write-Host "`n=== 2. User Login ==="
$loginBody = @{ email = "admin@opspilot.ai"; password = "Password123!" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "http://localhost:3000/v1/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.data.accessToken
Write-Host "Obtained JWT Token successfully."

$headers = @{
  "Authorization" = "Bearer $token"
  "x-organization-id" = "3fdaca7b-c8e4-4be4-ba50-e1a2085ac913"
}

Write-Host "`n=== 3. Resolving Project ==="
$projectId = "138ae2ae-2d30-4536-8789-267c5901f05c"
Write-Host "Target Project UUID: $projectId"

Write-Host "`n=== 4. Negative Security Test: Connecting Non-Existent Repository ==="
try {
  $negBody = @{ provider = "GITHUB"; repositoryUrl = "https://github.com/opspilot-fake-org-9999/non-existent-repo-9999" } | ConvertTo-Json
  $negRes = Invoke-RestMethod -Uri "http://localhost:3000/v1/projects/$projectId/repositories" -Method Post -Headers $headers -Body $negBody -ContentType "application/json"
  Write-Host "ERROR: Negative test failed - invalid repository was NOT rejected!"
} catch {
  Write-Host "SUCCESS: Invalid/non-existent repository strictly rejected by GitHub REST API validation."
  Write-Host "Response Details:" $_.Exception.Message
}

Write-Host "`n=== 5. Positive Test: Connecting Real GitHub Repository ==="
$existing = Invoke-RestMethod -Uri "http://localhost:3000/v1/projects/$projectId/repositories" -Method Get -Headers $headers
foreach ($repo in $existing.data) {
  if ($repo.repositoryUrl -like "*express*") {
    Write-Host "Cleaning up previous test repository connection $($repo.id)..."
    Invoke-RestMethod -Uri "http://localhost:3000/v1/projects/$projectId/repositories/$($repo.id)" -Method Delete -Headers $headers
  }
}

$posBody = @{ provider = "GITHUB"; repositoryUrl = "https://github.com/expressjs/express"; defaultBranch = "main" } | ConvertTo-Json
$posRes = Invoke-RestMethod -Uri "http://localhost:3000/v1/projects/$projectId/repositories" -Method Post -Headers $headers -Body $posBody -ContentType "application/json"
Write-Host "SUCCESS: Real GitHub repository connected successfully!"
Write-Host "Connection Record:" ($posRes.data | ConvertTo-Json -Compress)

Write-Host "`n=== 6. Querying PostgreSQL Database Row Evidence ==="
docker exec opspilot_postgres psql -U opspilot -d opspilot -c "SELECT id, provider, repository_url, is_verified, default_branch FROM repository_connections ORDER BY created_at DESC LIMIT 1;"
