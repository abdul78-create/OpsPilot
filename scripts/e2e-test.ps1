# OpsPilot E2E CI/CD Loop Test Script
# Tests both SUCCESS and FAILURE paths with real DB evidence
# Usage: .\scripts\e2e-test.ps1

param(
    [string]$BackendUrl = "http://localhost:3000",
    [string]$PostgresContainer = "opspilot_postgres",
    [string]$PostgresUser = "opspilot",
    [string]$PostgresDb = "opspilot"
)

function Write-Header($msg) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
}

function Write-Ok($msg)   { Write-Host "  + $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  X $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "  > $msg" -ForegroundColor Yellow }

function Get-DbCount($query) {
    $result = docker exec $PostgresContainer psql -U $PostgresUser -d $PostgresDb -t -c $query 2>&1
    return ($result -replace '\s','').Trim()
}

function Send-Webhook($repoUrl, $repoCloneUrl, $deliveryId, $commitSha) {
    $payload = @{
        ref        = "refs/heads/main"
        after      = $commitSha
        created    = $false
        repository = @{
            html_url  = $repoUrl
            clone_url = $repoCloneUrl
            name      = ($repoUrl -split '/')[-1]
        }
        head_commit = @{
            id      = $commitSha
            message = "OpsPilot E2E test run"
        }
        sender = @{ login = "opspilot-e2e-tester" }
    } | ConvertTo-Json -Depth 5

    try {
        $response = Invoke-RestMethod `
            -Uri "$BackendUrl/v1/webhooks/github" `
            -Method POST `
            -ContentType "application/json" `
            -Body $payload `
            -Headers @{
                "x-github-event"    = "push"
                "x-github-delivery" = $deliveryId
            }
        return $response
    } catch {
        Write-Fail "Webhook request failed: $_"
        return $null
    }
}

function Wait-ForRun($runId, $maxSeconds = 180) {
    Write-Info "Waiting up to ${maxSeconds}s for run to complete..."
    $elapsed = 0
    while ($elapsed -lt $maxSeconds) {
        Start-Sleep -Seconds 5
        $elapsed += 5
        $status = docker exec $PostgresContainer psql -U $PostgresUser -d $PostgresDb -t -c `
            "SELECT status FROM pipeline_runs WHERE id = '$runId';" 2>&1
        $status = ($status -replace '\s','').Trim()
        Write-Info "[${elapsed}s] Run status: $status"
        if ($status -eq "SUCCESS" -or $status -eq "FAILED" -or $status -eq "TIMEOUT") {
            return $status
        }
    }
    return "TIMEOUT_WAIT"
}

# BASELINE
Write-Header "BASELINE"
$baseRuns        = Get-DbCount "SELECT COUNT(*) FROM pipeline_runs;"
$baseArtifacts   = Get-DbCount "SELECT COUNT(*) FROM artifacts;"
$baseDeployments = Get-DbCount "SELECT COUNT(*) FROM deployments;"
$baseAiReports   = Get-DbCount "SELECT COUNT(*) FROM ai_analysis_reports;"
Write-Info "pipeline_runs=$baseRuns artifacts=$baseArtifacts deployments=$baseDeployments ai_reports=$baseAiReports"

# TEST 1 - SUCCESS PATH
Write-Header "TEST 1 - SUCCESS PATH (expressjs/express)"
$delivery1 = "e2e-success-$(Get-Date -Format 'yyyyMMddHHmmss')"
$sha1      = "aabbcc1100000000000000000000000000000000"

$resp1 = Send-Webhook "https://github.com/expressjs/express" "https://github.com/expressjs/express" $delivery1 $sha1

if ($resp1 -and $resp1.data.runId) {
    $runId1 = $resp1.data.runId
    Write-Ok "Webhook accepted runId=$runId1 jobsEnqueued=$($resp1.data.jobsEnqueued)"
    Write-Ok "Stack: language=$($resp1.data.stack.language) framework=$($resp1.data.stack.framework)"

    $finalStatus1 = Wait-ForRun $runId1 180

    Write-Header "TEST 1 RESULTS"
    docker exec $PostgresContainer psql -U $PostgresUser -d $PostgresDb -c "SELECT id, status, duration_seconds FROM pipeline_runs WHERE id = '$runId1';"
    docker exec $PostgresContainer psql -U $PostgresUser -d $PostgresDb -c "SELECT id, name, checksum, status FROM artifacts WHERE pipeline_run_id = '$runId1';"
    docker exec $PostgresContainer psql -U $PostgresUser -d $PostgresDb -c "SELECT id, status, release_version FROM deployments WHERE pipeline_run_id = '$runId1';"

    if ($finalStatus1 -eq "SUCCESS") { Write-Ok "SUCCESS PATH PROVEN" }
    else { Write-Info "Status: $finalStatus1" }
}

# TEST 2 - FAILURE + AI RCA
Write-Header "TEST 2 - FAILURE PATH (non-existent repo)"
$delivery2 = "e2e-failure-$(Get-Date -Format 'yyyyMMddHHmmss')"
$sha2      = "deadbeef0000000000000000000000000000dead"

$resp2 = Send-Webhook "https://github.com/opspilot-test/does-not-exist-intentional" "https://github.com/opspilot-test/does-not-exist-intentional" $delivery2 $sha2

if ($resp2 -and $resp2.data.runId) {
    $runId2 = $resp2.data.runId
    Write-Ok "Webhook accepted runId=$runId2"

    $finalStatus2 = Wait-ForRun $runId2 120

    docker exec $PostgresContainer psql -U $PostgresUser -d $PostgresDb -c "SELECT id, status, duration_seconds FROM pipeline_runs WHERE id = '$runId2';"

    Write-Info "Waiting 30s for AI RCA..."
    Start-Sleep -Seconds 30

    docker exec $PostgresContainer psql -U $PostgresUser -d $PostgresDb -c "SELECT id, type, risk_level, summary FROM ai_analysis_reports WHERE target_id = '$runId2';"

    if ($finalStatus2 -eq "FAILED") { Write-Ok "FAILURE PATH PROVEN" }
    else { Write-Info "Status: $finalStatus2" }
}

# FINAL DELTA
Write-Header "FINAL DB DELTA"
$endRuns        = Get-DbCount "SELECT COUNT(*) FROM pipeline_runs;"
$endArtifacts   = Get-DbCount "SELECT COUNT(*) FROM artifacts;"
$endDeployments = Get-DbCount "SELECT COUNT(*) FROM deployments;"
$endAiReports   = Get-DbCount "SELECT COUNT(*) FROM ai_analysis_reports;"

Write-Info "pipeline_runs:  $baseRuns -> $endRuns  (+$([int]$endRuns - [int]$baseRuns))"
Write-Info "artifacts:      $baseArtifacts -> $endArtifacts  (+$([int]$endArtifacts - [int]$baseArtifacts))"
Write-Info "deployments:    $baseDeployments -> $endDeployments  (+$([int]$endDeployments - [int]$baseDeployments))"
Write-Info "ai_reports:     $baseAiReports -> $endAiReports  (+$([int]$endAiReports - [int]$baseAiReports))"
Write-Header "E2E TEST COMPLETE"
