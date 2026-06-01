@echo off
REM Pre-push hook to run fast backend quality gates
REM This hook runs before git push to ensure code quality

echo Running fast backend quality gates...

REM Check if backend files changed
git diff --name-only HEAD@{push} HEAD 2>nul | findstr /R "^BackEnd/" >nul
if %errorlevel% neq 0 (
    echo No backend files changed. Skipping quality gates.
    exit /b 0
)

echo Backend files changed. Running quality gates...

REM Navigate to backend directory
cd BackEnd

REM Run ESLint (fast lint check)
echo Running ESLint...
call npm run lint -- --max-warnings=0
if %errorlevel% neq 0 (
    echo ESLint check failed!
    exit /b 1
)

REM Run Prettier format check
echo Running Prettier format check...
call npm run format -- --check
if %errorlevel% neq 0 (
    echo Prettier format check failed!
    exit /b 1
)

REM Run TypeScript type check
echo Running TypeScript type check...
call npx tsc --noEmit
if %errorlevel% neq 0 (
    echo TypeScript type check failed!
    exit /b 1
)

echo All fast backend quality gates passed!
exit /b 0
