# ===========================================
# Yarn build script with error logging only
# ===========================================

# Generate timestamped log filename
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = "build_errors_$timestamp.txt"

Write-Host "🚀 Starting Yarn build... (saving errors to $logFile)" -ForegroundColor Cyan

# Run yarn build, redirect only errors
# The build continues because we do NOT stop on non-zero exit codes
yarn build 2> $logFile
$exitCode = $LASTEXITCODE   # capture exit code manually

# Show result
if ($exitCode -eq 0) {
    Write-Host "✅ Build completed successfully." -ForegroundColor Green
} else {
    Write-Host "⚠️ Build completed WITH ERRORS. See: $logFile" -ForegroundColor Yellow
}

Write-Host "📄 Error log saved to: $(Resolve-Path $logFile)"
