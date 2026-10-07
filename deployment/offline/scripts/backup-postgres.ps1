$ErrorActionPreference = "Stop"

$BackupDir = "C:\StockAI-Polymers-Offline\deployment\offline\backups"
$LogDir = "C:\StockAI-Polymers-Offline\deployment\offline\logs"

$Container = "stockai-offline-postgres"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$FileName = "stockai-$Timestamp.dump"

$HostFile = Join-Path $BackupDir $FileName
$ContainerFile = "/tmp/$FileName"
$LogFile = Join-Path $LogDir "backup-task.log"

New-Item -ItemType Directory -Force $BackupDir | Out-Null
New-Item -ItemType Directory -Force $LogDir | Out-Null

Start-Transcript -Path $LogFile -Append

try {
    Write-Host "StockAI offline PostgreSQL backup started."
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

    $Docker = "C:\Users\MS Avadanulu\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe"

    if (-not (Test-Path $Docker)) {
        $DockerCommand = Get-Command docker.exe -ErrorAction Stop
        $Docker = $DockerCommand.Source
    }

    Write-Host "Docker: $Docker"

    if (-not (Test-Path $Docker)) {
        throw "Docker executable not found."
    }

    # Verify the PostgreSQL container is running.
    $RunningContainer = & $Docker ps `
        --filter "name=^$Container$" `
        --filter "status=running" `
        --format "{{.Names}}"

    if ($LASTEXITCODE -ne 0) {
        throw "Unable to query Docker containers."
    }

    if ($RunningContainer -ne $Container) {
        throw "PostgreSQL container '$Container' is not running."
    }

    Write-Host "PostgreSQL container is running."

    # Create the PostgreSQL custom-format dump directly inside the container.
    & $Docker exec $Container `
        pg_dump `
        -U stockai `
        -d stockai `
        -Fc `
        -f $ContainerFile

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed."
    }

    Write-Host "PostgreSQL dump created inside container."

    # Copy the binary dump to the Windows host.
    & $Docker cp "${Container}:${ContainerFile}" $HostFile

    if ($LASTEXITCODE -ne 0) {
        throw "docker cp failed."
    }

    # Remove temporary container-side dump.
    & $Docker exec $Container rm -f $ContainerFile

    if (-not (Test-Path $HostFile)) {
        throw "Backup file was not created: $HostFile"
    }

    $SizeBytes = (Get-Item $HostFile).Length

    if ($SizeBytes -le 0) {
        Remove-Item $HostFile -Force
        throw "Backup file is empty."
    }

    Write-Host "Backup completed successfully."
    Write-Host "Backup file: $HostFile"
    Write-Host ("Backup size: {0:N0} bytes" -f $SizeBytes)

    # Keep the newest 24 hourly backups.
    Get-ChildItem $BackupDir -Filter "stockai-*.dump" -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip 24 |
        Remove-Item -Force

    Write-Host "Retention cleanup completed."

    exit 0
}
catch {
    Write-Host "BACKUP FAILED"
    Write-Host $_.Exception.Message
    exit 1
}
finally {
    Stop-Transcript
}
