@echo off
set NODE_VERSION=24.13.0

nvm use %NODE_VERSION%
if errorlevel 1 (
    echo Installing Node.js version %NODE_VERSION%...
    nvm install %NODE_VERSION%
    nvm use %NODE_VERSION%
)

pause