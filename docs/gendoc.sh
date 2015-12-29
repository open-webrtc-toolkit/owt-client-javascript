#!/bin/bash
#Example usage: ./gendoc.sh /home/bean/workspace/webrtc-javascript-sdk/docs/mdfiles/sipcomment.js
DOC_DIR_NAME="docout"
# config paths
SCRIPT_DIR=`pwd`
TRANSCODE_DIR=`cd ./js2doxy; pwd`
JSSDK_DIR=`cd ..; pwd`
JS_CODE="$JSSDK_DIR/src/sdk/conference/conference.js $JSSDK_DIR/src/sdk/base/events.js $JSSDK_DIR/src/sdk/base/stream.js $JSSDK_DIR/src/sdk/nuve/N.API.js $JSSDK_DIR/src/sdk/ui/ui.js $JSSDK_DIR/src/sdk/p2p/peer.js"
EXTRA_JSPATH=$@
DOC_DIR=$SCRIPT_DIR/$DOC_DIR_NAME
PSEUDO_DIR=$SCRIPT_DIR/pseudoJava
TEMPLATE_DIR=$SCRIPT_DIR/templates

# export transform tool jar
cd $TRANSCODE_DIR
ant clean build
cd $SCRIPT_DIR
ant clean create_run_jar

# run transform tool to get the pseudo code files
rm -rf $PSEUDO_DIR
mkdir $PSEUDO_DIR
java -jar jsdoc2doxygen.jar $JS_CODE $EXTRA_JSPATH
rm jsdoc2doxygen.jar
mv js_*.java $PSEUDO_DIR

# run doxygen to generate doc
cd $TEMPLATE_DIR
rm -rf ./Output
doxygen doxygen_js.conf > doc.log
cp $SCRIPT_DIR/mdfiles/resources/* ./Output/html/
rm -rf $DOC_DIR
mkdir -p $DOC_DIR
mv ./Output/html/* $DOC_DIR/
rm -rf Output
rm -rf $PSEUDO_DIR
