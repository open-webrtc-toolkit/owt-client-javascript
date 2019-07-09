#!/bin/bash
sysOS=`uname -s`
#Variables
USER_DIR=/tmp/testacular
MAC_CMD="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
#UBUNTU_CMD="/usr/bin/chromium-browser"
UBUNTU_CMD="/usr/bin/google-chrome"

# Test OS
if [ $sysOS == "Darwin" ];then
	CMD="$MAC_CMD"
elif [ $sysOS == "Linux" ];then
	CMD="$UBUNTU_CMD"
else
	echo "Other OS: $sysOS"
fi

# Execute the command
export DISPLAY=:0
exec "$CMD" --user-data-dir="$USER_DIR" --enable-logging --v=1 --allow-file-access-from-files  --no-proxy-server --no-sandbox --use-fake-ui-for-media-stream --disable-user-media-security --no-default-browser-check --no-first-run --disable-default-apps --disable-popup-blocking  --use-fake-device-for-media-stream --headless --remote-debugging-port=9222 "$@"
#exec "$CMD" --user-data-dir="$USER_DIR" --proxy-auto-detect --window-size=950,450 --use-fake-ui-for-media-stream --disable-user-media-security --no-default-browser-check --no-first-run --disable-default-apps --use-fake-device-for-media-stream  "$@"
