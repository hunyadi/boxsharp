@echo off

:: Prerequisites:
:: - Install CSS minifier for Python with `pip install rcssmin`
:: - Install Terser https://terser.org/ with `npm install -g terser`

python minify.py
if errorlevel 1 goto error
call terser boxsharp\boxsharp.sub.js -o boxsharp\boxsharp.min.js --ecma 2020 --module --compress --mangle
if errorlevel 1 goto error
del boxsharp\boxsharp.sub.js

goto :EOF

:error
exit /b 1
