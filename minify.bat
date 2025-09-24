@echo off
python minify.py
terser boxsharp/boxsharp.sub.js -o boxsharp/boxsharp.min.js --ecma 2020 --module --compress --mangle
