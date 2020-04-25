@echo off
pyinstaller -F --add-data "%cd%\;." pyncmd.py
del pyncmd.exe
copy dist\pyncmd.exe pyncmd.exe
REM Cleanups.
rmdir dist /S /Q
rmdir build /S /Q
rmdir __pycache__ /S /Q
del *.spec