param(
  [switch]$Deploy = $true,
  [switch]$SyncOnly = $false,
  [switch]$AllEnvironments = $false,
  [string]$EnvFile = ".env.local",
  [string]$Scope = "harea-mariuss-projects"
)

$ErrorActionPreference = "Continue"
$PSNativeCommandUseErrorActionPreference = $false

function Parse-EnvFile {
  param([string]$Path)
  $map = @{}
  if (-not (Test-Path $Path)) {
    throw "Fichier introuvable: $Path"
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $map[$key] = $value
  }

  return $map
}

function Ensure-VercelCli {
  if (-not (Get-Command vercel.cmd -ErrorAction SilentlyContinue)) {
    throw "Vercel CLI non trouvé. Installe d'abord: npm i -g vercel"
  }
}

function Ensure-VercelAuth {
  $who = & vercel.cmd whoami 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $who) {
    throw "Session Vercel non connectée. Lance: vercel login"
  }
  Write-Host "Connecté à Vercel: $who" -ForegroundColor Green
}

function Ensure-VercelLink {
  if (Test-Path ".vercel\project.json") {
    return
  }
  Write-Host "Projet non lié. Tentative de link automatique..." -ForegroundColor Yellow
  if ([string]::IsNullOrWhiteSpace($Scope)) {
    & vercel.cmd link --yes
  } else {
    & vercel.cmd link --yes --scope $Scope
  }
  if ($LASTEXITCODE -ne 0) {
    if ([string]::IsNullOrWhiteSpace($Scope)) {
      throw "Impossible de lier automatiquement le projet. Lance manuellement: vercel link --scope <team>"
    }
    throw "Impossible de lier automatiquement le projet. Lance manuellement: vercel link --scope $Scope"
  }
}

function Set-VercelEnvValue {
  param(
    [string]$Key,
    [string]$Value,
    [string]$Target
  )
  if ([string]::IsNullOrWhiteSpace($Value)) {
    Write-Host "Skip $Key ($Target): valeur vide" -ForegroundColor DarkYellow
    return
  }

  if ([string]::IsNullOrWhiteSpace($Scope)) {
    & vercel.cmd env rm $Key $Target --yes 2>$null | Out-Null
    $Value | & vercel.cmd env add $Key $Target | Out-Null
  } else {
    & vercel.cmd env rm $Key $Target --yes --scope $Scope 2>$null | Out-Null
    $Value | & vercel.cmd env add $Key $Target --scope $Scope | Out-Null
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Échec set env: $Key ($Target)"
  }
  Write-Host "OK $Key ($Target)" -ForegroundColor Cyan
}

Ensure-VercelCli
Ensure-VercelAuth
Ensure-VercelLink

$envPath = Resolve-Path $EnvFile
$envMap = Parse-EnvFile -Path $envPath

$requiredKeys = @(
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_CREATE_ONE_TIME",
  "STRIPE_PRICE_PRO_MONTHLY",
  "STRIPE_PRICE_AGENCE_MONTHLY",
  "STRIPE_COUPON_FIRST_TRIAL_50",
  "INTEGRATIONS_ENC_KEY",
  "IMAGE_OPTIMIZER_PROVIDER",
  "IMAGE_OPTIMIZER_TIMEOUT_MS",
  "IMAGE_BG_REMOVAL_PROVIDERS",
  "IMAGE_UPSCALE_PROVIDERS",
  "DIGITAL_DOWNLOAD_URL_TTL_SECONDS",
  "PRICING_MIN_MARGIN_PERCENT",
  "CLIPDROP_API_KEY"
)

$targets = @("production")
if ($AllEnvironments) {
  $targets = @("production", "preview", "development")
}

foreach ($target in $targets) {
  Write-Host "Sync env -> $target" -ForegroundColor Magenta
  foreach ($key in $requiredKeys) {
    $value = $null
    if ($envMap.ContainsKey($key)) {
      $value = $envMap[$key]
    }
    Set-VercelEnvValue -Key $key -Value $value -Target $target
  }
}

if ($SyncOnly) {
  Write-Host "Sync terminée (sans deploy)." -ForegroundColor Green
  exit 0
}

if ($Deploy) {
  Write-Host "Déploiement production..." -ForegroundColor Magenta
  if ([string]::IsNullOrWhiteSpace($Scope)) {
    & vercel.cmd --prod --yes
  } else {
    & vercel.cmd --prod --yes --scope $Scope
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Déploiement Vercel échoué."
  }
  Write-Host "Deploy production terminé." -ForegroundColor Green
}
