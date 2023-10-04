@echo off

echo Building ngx-aur-mat-table...
call ng build ngx-aur-mat-table
if errorlevel 1 goto error

echo Navigating to dist/ngx-aur-mat-table...
cd dist/ngx-aur-mat-table
if errorlevel 1 goto error

echo Publishing to npm...
npm publish
if errorlevel 1 goto error

echo Done!
exit /b 0

:error
echo Failed at step above.
exit /b 1
