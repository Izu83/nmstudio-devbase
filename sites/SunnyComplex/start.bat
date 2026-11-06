@echo off
rem Starts the Sunny Complex site and opens it in the browser. Keep this window open while you use the site.
cd /d "%~dp0"
title Sunny Complex
python server.py 5173 --open
if errorlevel 1 pause
