$ErrorActionPreference = 'Stop'

# The runner service may have a different PATH from an interactive terminal.
# Use Bash and GNU tar from the same Git for Windows installation, rather than
# Windows' BSD tar or the WSL bash launcher.
$roots = @()
foreach ($command in @(Get-Command git.exe -All -ErrorAction SilentlyContinue)) {
  $directory = Split-Path $command.Source -Parent
  for ($level = 0; $level -lt 3 -and $directory; $level++) {
    $roots += $directory
    $directory = Split-Path $directory -Parent
  }
}
foreach ($baseDirectory in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
  if ($baseDirectory) { $roots += Join-Path $baseDirectory 'Git' }
}
if ($env:LOCALAPPDATA) {
  $roots += Join-Path $env:LOCALAPPDATA 'Programs\Git'
}

$gitTools = $null
foreach ($root in ($roots | Select-Object -Unique)) {
  $candidate = Join-Path $root 'usr\bin'
  $tarPath = Join-Path $candidate 'tar.exe'
  $bashPath = Join-Path $candidate 'bash.exe'
  if ((Test-Path -LiteralPath $tarPath) -and (Test-Path -LiteralPath $bashPath)) {
    $version = & $tarPath --version
    if ($LASTEXITCODE -eq 0 -and ($version -join ' ') -match 'GNU tar') {
      $gitTools = $candidate
      break
    }
  }
}
if (-not $gitTools) {
  throw 'Git for Windows with usr\bin\bash.exe and GNU tar was not found. Install Git for Windows for the runner service account, then start a new workflow run.'
}
if (-not $env:GITHUB_PATH) {
  throw 'GITHUB_PATH is missing; run this script from a GitHub Actions step.'
}

$gitTools | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append
$env:PATH = "$gitTools;$env:PATH"
Write-Host "Pages tools: $gitTools"
& (Join-Path $gitTools 'bash.exe') --noprofile --norc -c 'tar --version | head -n 1'
if ($LASTEXITCODE -ne 0) { throw 'Git Bash could not execute GNU tar.' }
