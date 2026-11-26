param([switch]$Force)

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/blamag999/agent-workflow-template.git"
$TargetDir = Join-Path $env:USERPROFILE ".gemini\config\plugins\token-guard"
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("tg-install-" + [guid]::NewGuid().ToString("N"))

try {
    git clone --depth 1 $RepoUrl $TempDir | Out-Null
    $SrcDir = Join-Path $TempDir ".agents\plugins\token-guard"
    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

    $ExistingCfg = $null
    $CfgPath = Join-Path $TargetDir "config.json"
    if ((-not $Force) -and (Test-Path $CfgPath)) {
        $ExistingCfg = Get-Content -Raw -Encoding UTF8 $CfgPath
    }

    Copy-Item -Path (Join-Path $SrcDir "*") -Destination $TargetDir -Recurse -Force
    if ($ExistingCfg) {
        [System.IO.File]::WriteAllText($CfgPath, $ExistingCfg, [System.Text.UTF8Encoding]::new($false))
    }

    Write-Host "Token Guard da duoc cai dat / cap nhat tai: $TargetDir" -ForegroundColor Green
} finally {
    if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
}
