# Vinted AI Assistant - Installation Script for Windows
# This script handles both fresh installation and server restart

$ErrorActionPreference = "Stop"

# Get the root directory (parent of installer/)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)

# Colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Print-Header {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "    Vinted AI Assistant - Installer" -ForegroundColor Blue
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Print-Step($message) {
    Write-Host "[>] $message" -ForegroundColor Blue
}

function Print-Success($message) {
    Write-Host "[OK] $message" -ForegroundColor Green
}

function Print-Warning($message) {
    Write-Host "[!] $message" -ForegroundColor Yellow
}

function Print-Error($message) {
    Write-Host "[X] $message" -ForegroundColor Red
}

# Check if already installed
function Check-Installation {
    $nodeModulesExists = Test-Path "$RootDir\node_modules"
    $envExists = $false
    $dbExists = Test-Path "$RootDir\apps\backend\data\vinted-ai.db"

    if (Test-Path "$RootDir\apps\backend\.env") {
        $envContent = Get-Content "$RootDir\apps\backend\.env" -Raw
        if ($envContent -match "(GOOGLE_GENERATIVE_AI_API_KEY|OPENAI_API_KEY)=.+") {
            $envExists = $true
        }
    }

    return ($nodeModulesExists -and $envExists -and $dbExists)
}

# Install pnpm if not present
function Install-Pnpm {
    $pnpmExists = Get-Command pnpm -ErrorAction SilentlyContinue

    if ($pnpmExists) {
        $version = pnpm --version
        Print-Success "pnpm already installed ($version)"
        return
    }

    Print-Step "Installing pnpm..."

    $npmExists = Get-Command npm -ErrorAction SilentlyContinue

    if ($npmExists) {
        npm install -g pnpm
    } else {
        # Try winget first
        $wingetExists = Get-Command winget -ErrorAction SilentlyContinue
        if ($wingetExists) {
            winget install pnpm.pnpm
        } else {
            # Fallback to PowerShell installation
            Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression
        }
    }

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    Print-Success "pnpm installed"
}

# Install Bun if not present
function Install-Bun {
    $bunExists = Get-Command bun -ErrorAction SilentlyContinue

    if ($bunExists) {
        $version = bun --version
        Print-Success "Bun already installed ($version)"
        return
    }

    Print-Step "Installing Bun..."

    # Install Bun using PowerShell
    powershell -c "irm bun.sh/install.ps1 | iex"

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    $env:BUN_INSTALL = "$env:USERPROFILE\.bun"
    $env:Path = "$env:BUN_INSTALL\bin;$env:Path"

    Print-Success "Bun installed"
}

# Ask for API key
function Configure-ApiKey {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "Configuration de l'API" -ForegroundColor Blue
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Choisis ton provider d'IA:"
    Write-Host ""
    Write-Host "  [G] Google Gemini " -NoNewline -ForegroundColor Green
    Write-Host "(recommande - gratuit)" -ForegroundColor Yellow
    Write-Host "      -> https://aistudio.google.com/apikey"
    Write-Host ""
    Write-Host "  [O] OpenAI" -ForegroundColor Blue
    Write-Host "      -> https://platform.openai.com/api-keys"
    Write-Host ""

    $provider = ""
    $providerName = ""

    while ($true) {
        $choice = Read-Host "Ton choix (G/O)"
        switch -Regex ($choice) {
            "^[Gg]" {
                $provider = "GOOGLE_GENERATIVE_AI_API_KEY"
                $providerName = "Google Gemini"
                break
            }
            "^[Oo]" {
                $provider = "OPENAI_API_KEY"
                $providerName = "OpenAI"
                break
            }
            default {
                Print-Warning "Tape G pour Gemini ou O pour OpenAI"
                continue
            }
        }
        break
    }

    Write-Host ""
    Print-Step "Obtiens ta cle API sur le site du provider, puis colle-la ici."
    Write-Host ""
    $apiKey = Read-Host "Cle API $providerName"

    if ([string]::IsNullOrWhiteSpace($apiKey)) {
        Print-Error "La cle API ne peut pas etre vide"
        exit 1
    }

    # Create data directory if needed
    $dataDir = "$RootDir\apps\backend\data"
    if (-not (Test-Path $dataDir)) {
        New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    }

    # Create .env file
    $envContent = @"
# Vinted AI Assistant - Configuration
# Generated by installer on $(Get-Date)

$provider=$apiKey
PORT=3000
"@

    Set-Content -Path "$RootDir\apps\backend\.env" -Value $envContent -Encoding UTF8

    Print-Success "Configuration enregistree dans apps/backend/.env"
}

# Install npm dependencies
function Install-Dependencies {
    Print-Step "Installation des dependances npm..."
    Set-Location $RootDir
    pnpm install
    Print-Success "Dependances installees"
}

# Setup database
function Setup-Database {
    Print-Step "Creation de la base de donnees..."
    Set-Location $RootDir
    pnpm --filter backend db:push
    Print-Success "Base de donnees creee"
}

# Build extension
function Build-Extension {
    Print-Step "Compilation de l'extension Chrome..."
    Set-Location $RootDir
    pnpm --filter extension build
    Print-Success "Extension compilee dans apps/extension/dist/"
}

# Open install guide
function Open-Guide {
    $guidePath = "$RootDir\installer\INSTALL_GUIDE.html"

    if (Test-Path $guidePath) {
        Print-Step "Ouverture du guide d'installation de l'extension..."
        Start-Process $guidePath
    }
}

# Start server
function Start-Server {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "  Demarrage du serveur..." -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Le serveur va demarrer sur " -NoNewline
    Write-Host "http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pour arreter le serveur : Ctrl+C" -ForegroundColor Yellow
    Write-Host ""

    Set-Location $RootDir
    pnpm --filter backend dev
}

# Main installation flow
function Main {
    Print-Header

    Set-Location $RootDir

    if (Check-Installation) {
        Write-Host "Installation existante detectee !" -ForegroundColor Green
        Write-Host ""
        Print-Step "Demarrage du serveur..."
        Start-Server
    } else {
        Write-Host "Premiere installation detectee" -ForegroundColor Yellow
        Write-Host ""

        # Step 1: Install system dependencies
        Print-Step "Verification des dependances systeme..."
        Install-Pnpm
        Install-Bun

        # Step 2: Configure API key
        Configure-ApiKey

        # Step 3: Install npm dependencies
        Install-Dependencies

        # Step 4: Setup database
        Setup-Database

        # Step 5: Build extension
        Build-Extension

        # Step 6: Open guide
        Open-Guide

        Write-Host ""
        Write-Host "================================================" -ForegroundColor Green
        Write-Host "  Installation terminee avec succes !" -ForegroundColor Green
        Write-Host "================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Extension Chrome: " -NoNewline
        Write-Host "$RootDir\apps\extension\dist\" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Prochaine etape: " -NoNewline -ForegroundColor Yellow
        Write-Host "Suis le guide pour installer l'extension Chrome"
        Write-Host ""

        # Step 7: Start server
        Start-Server
    }
}

# Run main
Main
