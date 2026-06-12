# Cyber Defense Lab - local server launcher (PowerShell)
# Does the same thing as start.bat: starts a local server on port 3900 and opens the game.

Write-Host "Starting Cyber Defense Lab..."
Write-Host ""
Write-Host "Recommended URL:"
Write-Host "http://localhost:3900"
Write-Host ""

$python = Get-Command python -ErrorAction SilentlyContinue
$py     = Get-Command py     -ErrorAction SilentlyContinue

if ($python) {
    Start-Process "http://localhost:3900"
    python -m http.server 3900
}
elseif ($py) {
    Start-Process "http://localhost:3900"
    py -m http.server 3900
}
else {
    Write-Host "Python was not found."
    Write-Host "Please install Python or use another local server."
    Write-Host ""
    Write-Host "You can also try opening index.html directly, but localhost is recommended."
    Read-Host "Press Enter to exit"
}
