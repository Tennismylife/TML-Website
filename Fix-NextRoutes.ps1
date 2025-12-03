# ===========================================
# Fix-NextRoutes.ps1
# -------------------------------------------
# PowerShell script to fix all Next.js route handlers.
# Works on all PowerShell versions (no -Raw needed).
# ===========================================

# Get all .ts and .tsx files under app/api/
$files = Get-ChildItem -Path ".\app\api" -Recurse -Include *.ts, *.tsx

Write-Host "Found $($files.Count) route files under app/api/..." -ForegroundColor Cyan

foreach ($file in $files) {
    # Read full file content manually (compatible with all versions)
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $originalContent = $content

    # (1) Fix function signature
    $content = [regex]::Replace(
        $content,
        'export\s+async\s+function\s+GET\s*\(\s*request:\s*NextRequest,\s*\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*id:\s*string\s*\}\s*\}\s*\)',
        'export async function GET(request: NextRequest, context: { params: { id: string } })'
    )

    # (2) Fix internal "const { id } = params;"
    $content = [regex]::Replace(
        $content,
        'const\s*\{\s*id\s*\}\s*=\s*params\s*;',
        'const { id } = context.params;'
    )

    # Save only if changed
    if ($content -ne $originalContent) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Fixed: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host "All done! Files updated successfully." -ForegroundColor Cyan
