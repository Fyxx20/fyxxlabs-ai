param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Error "Supabase CLI n'est pas installee. Installe-la d'abord: https://supabase.com/docs/guides/cli"
}

Write-Host "Execution des migrations Supabase..." -ForegroundColor Cyan

if ($DryRun) {
  Write-Host "Mode simulation (--dry-run)" -ForegroundColor Yellow
  supabase db push --dry-run
} else {
  supabase db push
}

Write-Host "Termine." -ForegroundColor Green
