$ErrorActionPreference = "Stop"

$Projeto = Split-Path -Parent $PSScriptRoot
$JsonPath = Join-Path $Projeto "dados\30th-celebration.json"
$Destino = Join-Path $Projeto "assets\img\cartas\30th-celebration"

if (-not (Test-Path $JsonPath)) {
    Write-Host "Arquivo nao encontrado: $JsonPath" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$dados = Get-Content $JsonPath -Raw -Encoding UTF8 | ConvertFrom-Json

if (-not $dados.cards -or $dados.cards.Count -eq 0) {
    Write-Host "O JSON nao possui cartas." -ForegroundColor Red
    exit 1
}

function Get-ExtensaoImagem([string]$arquivo) {
    $bytes = [System.IO.File]::ReadAllBytes($arquivo)
    if ($bytes.Length -ge 12 -and
        $bytes[0] -eq 0x52 -and $bytes[1] -eq 0x49 -and $bytes[2] -eq 0x46 -and $bytes[3] -eq 0x46 -and
        $bytes[8] -eq 0x57 -and $bytes[9] -eq 0x45 -and $bytes[10] -eq 0x42 -and $bytes[11] -eq 0x50) { return "webp" }
    if ($bytes.Length -ge 8 -and $bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47) { return "png" }
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8 -and $bytes[2] -eq 0xFF) { return "jpg" }
    return "img"
}

$baixadas = 0
$puladas = 0
$falhas = 0
$total = $dados.cards.Count

for ($i = 0; $i -lt $total; $i++) {
    $carta = $dados.cards[$i]
    $numero = ([string]$carta.localId).PadLeft(3, '0')
    $url = if ($carta.imageHigh) { [string]$carta.imageHigh } else { [string]$carta.image }

    Write-Progress -Activity "Baixando cartas do 30th Celebration" -Status "$($i + 1) de $total - $($carta.name)" -PercentComplete ((($i + 1) / $total) * 100)

    if ([string]::IsNullOrWhiteSpace($url)) {
        Write-Host "SEM URL  [$numero] $($carta.name)" -ForegroundColor Yellow
        $falhas++
        continue
    }

    $existente = Get-ChildItem -Path $Destino -File -ErrorAction SilentlyContinue | Where-Object { $_.BaseName -eq $numero } | Select-Object -First 1
    if ($existente) {
        $rel = "assets/img/cartas/30th-celebration/$($existente.Name)"
        $carta.imagemLocal = $rel
        Write-Host "OK        [$numero] ja existe: $($existente.Name)" -ForegroundColor DarkGray
        $puladas++
        continue
    }

    $tmp = Join-Path $env:TEMP ("dexvault-" + [guid]::NewGuid().ToString() + ".tmp")
    try {
        Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -TimeoutSec 45
        $ext = Get-ExtensaoImagem $tmp
        if ($ext -eq "img") { throw "Formato de imagem nao reconhecido" }

        $nomeArquivo = "$numero.$ext"
        $arquivoFinal = Join-Path $Destino $nomeArquivo
        Move-Item -Force $tmp $arquivoFinal
        $carta.imagemLocal = "assets/img/cartas/30th-celebration/$nomeArquivo"
        $baixadas++
        Write-Host "BAIXADA   [$numero] $($carta.name) -> $nomeArquivo" -ForegroundColor Green
    }
    catch {
        if (Test-Path $tmp) { Remove-Item -Force $tmp }
        $falhas++
        Write-Host "FALHOU    [$numero] $($carta.name): $($_.Exception.Message)" -ForegroundColor Red
    }

    Start-Sleep -Milliseconds 100
}

Write-Progress -Activity "Baixando cartas do 30th Celebration" -Completed

$jsonAtualizado = $dados | ConvertTo-Json -Depth 30
[System.IO.File]::WriteAllText($JsonPath, $jsonAtualizado, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ""
Write-Host "Concluido." -ForegroundColor Cyan
Write-Host "Baixadas: $baixadas | Ja existentes: $puladas | Falhas: $falhas | Total: $total"
Write-Host "JSON atualizado automaticamente com o caminho real de cada imagem."
