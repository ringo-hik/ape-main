# 이 스크립트는 WSL 경로를 Windows 드라이브 문자에 매핑하여 npm 명령어 실행 시 발생하는 경로 문제를 해결합니다.
# 관리자 권한으로 PowerShell을 실행한 후 이 스크립트를 실행하세요.

# WSL 사용자 이름 (수정 필요)
$WSL_USERNAME = "hik90"

# WSL 배포판 이름 (기본값은 Ubuntu, 필요시 수정)
$WSL_DISTRO = "Ubuntu"

# 매핑할 드라이브 문자
$DRIVE_LETTER = "W"

# 이미 사용 중인 드라이브 제거
if (Get-PSDrive $DRIVE_LETTER -ErrorAction SilentlyContinue) {
    Remove-PSDrive $DRIVE_LETTER
    Write-Host "기존 $DRIVE_LETTER 드라이브 매핑을 제거했습니다."
}

# WSL 프로젝트 경로
$WSL_PATH = "\\wsl.localhost\$WSL_DISTRO\home\$WSL_USERNAME\axiom-extension"

# 드라이브 문자에 WSL 경로 매핑
try {
    New-PSDrive -Name $DRIVE_LETTER -PSProvider FileSystem -Root $WSL_PATH -Persist
    Write-Host "WSL 경로 '$WSL_PATH'가 '$DRIVE_LETTER:' 드라이브에 성공적으로 매핑되었습니다."
    Write-Host "이제 다음 명령어로 빌드할 수 있습니다:"
    Write-Host "cd $DRIVE_LETTER:"
    Write-Host "npm install"
    Write-Host "npm run build"
} catch {
    Write-Host "드라이브 매핑 실패: $_" -ForegroundColor Red
    Write-Host "관리자 권한으로 PowerShell을 실행했는지 확인하세요." -ForegroundColor Yellow
}