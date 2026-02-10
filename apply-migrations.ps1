# 📝 Script pour appliquer les migrations Supabase
# Usage: .\apply-migrations.ps1

$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SupabaseUrl -or -not $ServiceRoleKey) {
    Write-Host "❌ Erreur: Variables d'environnement manquantes!" -ForegroundColor Red
    Write-Host "Assurez-vous que .env.local contient:" -ForegroundColor Yellow
    Write-Host "  - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Application des migrations Supabase..." -ForegroundColor Cyan
Write-Host "URL: $SupabaseUrl" -ForegroundColor Gray

$migrationsFolder = ".\supabase\migrations"
$files = Get-ChildItem -Path $migrationsFolder -Filter "*.sql" | Sort-Object Name

Write-Host "📋 Total migrations: $($files.Count)" -ForegroundColor Cyan

$count = 0
foreach ($file in $files) {
    Write-Host "`n📄 [$($file.BaseName)]" -ForegroundColor Yellow
    
    $sqlContent = Get-Content $file.FullName -Raw
    
    # Créer un payload JSON avec le SQL
    $body = @{
        query = $sqlContent
    } | ConvertTo-Json -Depth 10 -EscapeHandling Default
    
    try {
        # Utiliser Invoke-WebRequest pour exécuter
        $response = Invoke-WebRequest -Uri "$SupabaseUrl/rest/v1/" `
            -Method POST `
            -Headers @{
                "Authorization" = "Bearer $ServiceRoleKey"
                "apikey" = $ServiceRoleKey
                "Content-Type" = "application/json"
                "Prefer" = "exec=true"
            } `
            -Body $body `
            -ErrorAction Stop `
            -WarningAction SilentlyContinue
        
        Write-Host "  ✅ OK" -ForegroundColor Green
        $count++
    } catch {
        Write-Host "  ⚠️  Possible erreur (normal si déjà appliquée)" -ForegroundColor Yellow
        Write-Host "     $_" -ForegroundColor Gray
    }
}

Write-Host "`n✨ Résumé: $count migrations traitées" -ForegroundColor Cyan
Write-Host "`nℹ️ Vérifiez sur https://app.supabase.com pour confirmer" -ForegroundColor Green

