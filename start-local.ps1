# Start ActionMeet Local Environment
Write-Host "🚀 Starting ActionMeet Backend..." -ForegroundColor Cyan
$BackendJob = Start-Process cmd -ArgumentList "/k cd /d $PSScriptRoot\server && npm start" -WindowStyle Normal -PassThru

Write-Host "🚀 Starting ActionMeet Frontend..." -ForegroundColor Cyan
$FrontendJob = Start-Process cmd -ArgumentList "/k cd /d $PSScriptRoot\client && npx serve public -l 3000 --cors" -WindowStyle Normal -PassThru

Write-Host "⏳ Waiting for servers to be ready..." -ForegroundColor Yellow

function Wait-ForPort($Port) {
    $retry = 0
    while ($retry -lt 30) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", $Port)
            $tcp.Close()
            return $true
        } catch {
            $retry++
            Start-Sleep -Seconds 1
        }
    }
    return $false
}

if (Wait-ForPort 3001) {
    Write-Host "✅ Backend is UP on port 3001" -ForegroundColor Green
} else {
    Write-Host "❌ Backend failed to start on port 3001" -ForegroundColor Red
}

if (Wait-ForPort 3000) {
    Write-Host "✅ Frontend is UP on port 3000" -ForegroundColor Green
    Write-Host "🌍 Opening browser..." -ForegroundColor Cyan
    Start-Process "http://localhost:3000"
} else {
    Write-Host "❌ Frontend failed to start on port 3000" -ForegroundColor Red
}

Write-Host "`n✨ ActionMeet is ready! Keep the terminal windows open." -ForegroundColor DarkCyan
