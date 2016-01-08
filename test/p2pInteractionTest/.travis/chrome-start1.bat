set USER_DIR="\tmp\testacular"
set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
set DISPLAY=:0
%CHROME_PATH% --user-data-dir=%USER_DIR% --window-position=30,30 --window-size=950,450 --use-fake-ui-for-media-stream --disable-user-media-security --no-default-browser-check --no-first-run --disable-default-apps --use-fake-device-for-media-stream "%*"