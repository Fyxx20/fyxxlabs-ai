#!/usr/bin/env pwsh

<#
.SYNOPSIS
  Applique les migrations Supabase du dossier ./supabase/migrations
.DESCRIPTION
  Liste et affiche les instructions pour appliquer chaque migration
#>

Write-Host "`nRocket Migrations Supabase - Verification" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Lister les migrations
$migrationsFolder = ".\supabase\migrations"
if (-not (Test-Path $migrationsFolder)) {
    Write-Host "Erreur: Dossier $migrationsFolder non trouve!" -ForegroundColor Red
    exit 1
}

$files = Get-ChildItem -Path $migrationsFolder -Filter "*.sql" | Sort-Object Name

Write-Host "`nFichiers de migration trouves: $($files.Count)" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Gray

foreach ($file in $files) {
    $number = $file.BaseName
    Write-Host "`n[$number]" -ForegroundColor Yellow
    
    # Afficher les premières lignes du fichier
    $content = Get-Content $file.FullName -Head 5
    foreach ($line in $content) {
        if ($line.StartsWith("--")) {
            Write-Host "  $line" -ForegroundColor Gray
        }
    }
}

Write-Host "`n================================================" -ForegroundColor Gray
Write-Host "`n2 METHODES POUR APPLIQUER LES MIGRATIONS:" -ForegroundColor Cyan

Write-Host "`n1️⃣  METHODE SIMPLE - Via Dashboard Supabase" -ForegroundColor Yellow
Write-Host "   a) Va sur: https://app.supabase.com" -ForegroundColor Green
Write-Host "   b) Clique New Query" -ForegroundColor Green
Write-Host "   c) Copie-colle le contenu de chaque fichier SQL" -ForegroundColor Green
Write-Host "   d) Clique Execute" -ForegroundColor Green
Write-Host "   Ordre: 001, 002, 003, ..., 012" -ForegroundColor Green

Write-Host "`n2️⃣  METHODE RAPIDE - Via Supabase CLI" -ForegroundColor Yellow
Write-Host "   Commandes:" -ForegroundColor Green
Write-Host "   supabase link --project-ref efgfktednxrhomeonhac" -ForegroundColor Cyan
Write-Host "   supabase db push" -ForegroundColor Cyan

Write-Host "`n================================================" -ForegroundColor Gray
Write-Host "`nUne fois appliquees, relance le serveur:" -ForegroundColor Green
Write-Host "   npm run dev" -ForegroundColor Cyan

Write-Host "`n"
