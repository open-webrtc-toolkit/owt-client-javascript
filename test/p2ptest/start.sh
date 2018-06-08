#!/bin/bash
this=$(cd $(dirname $0); pwd)
export DISPLAY=:0.0
testacular=${this}/node_modules/karma/bin/karma
if [[ $1 == 'chrome' ]];then
testconfig=${this}/.travis/testacular-chrome.config.js
elif [[ $1 == 'firefox' ]];then
testconfig=${this}/.travis/testacular-firefox.conf.js
elif [[ $1 == 'safari' ]];then
testconfig=${this}/.travis/testacular-safari.config.js
fi
echo "Running front-end tests"
${testacular} start ${testconfig}
