#!/bin/bash
src=src/sdk
test=test/unit/resources/scripts
mkdir -p $src
mkdir -p $test
cp -r ../../../$src/* $src
cp -r ../../..//$test/*.js $test
sed -i "s/chaiAsPromised/require('chai-as-promised')/" $test//*.js
source ~/.nvm/nvm.sh
nvm use v8
npm test
node failedcase.js reporter/unitTest.xml
