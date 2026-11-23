$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

$nodePath = $null
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $nodePath = $nodeCommand.Source
}

if (-not $nodePath) {
    $standardNode = Join-Path $env:ProgramFiles "nodejs\node.exe"
    if (Test-Path -LiteralPath $standardNode) {
        $nodePath = $standardNode
    }
}

if (-not $nodePath) {
    $codexPackages = Get-AppxPackage -Name "OpenAI.Codex" `
        -ErrorAction SilentlyContinue |
        Sort-Object Version -Descending

    foreach ($package in $codexPackages) {
        if (-not $package.InstallLocation) {
            continue
        }
        $candidate = Join-Path $package.InstallLocation `
            "app\resources\cua_node\bin\node.exe"
        if (Test-Path -LiteralPath $candidate) {
            $nodePath = $candidate
            break
        }
    }
}

if (-not $nodePath) {
    $codexProcess = Get-Process -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -like "*\OpenAI.Codex_*\app\*.exe" } |
        Select-Object -First 1

    if ($codexProcess) {
        $candidate = Join-Path (Split-Path -Parent $codexProcess.Path) `
            "resources\cua_node\bin\node.exe"
        if (Test-Path -LiteralPath $candidate) {
            $nodePath = $candidate
        }
    }
}

if (-not $nodePath) {
    $windowsApps = Join-Path $env:ProgramFiles "WindowsApps"
    $codexDirectory = Get-ChildItem -LiteralPath $windowsApps `
        -Directory -Filter "OpenAI.Codex_*" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending

    foreach ($directory in $codexDirectory) {
        $candidate = Join-Path $directory.FullName `
            "app\resources\cua_node\bin\node.exe"
        if (Test-Path -LiteralPath $candidate) {
            $nodePath = $candidate
            break
        }
    }
}

if (-not $nodePath) {
    throw "Node.js 24 was not found. Install Node.js 24 and try again."
}

Write-Host "Starting website: http://127.0.0.1:3000/"
$siteArguments = @(
    "node_modules\@docusaurus\core\bin\docusaurus.mjs",
    "start",
    "--host", "127.0.0.1",
    "--port", "3000"
)
if ($env:NEOFORGE_SITE_NO_OPEN -eq "1") {
    $siteArguments += "--no-open"
}
& $nodePath @siteArguments
exit $LASTEXITCODE
