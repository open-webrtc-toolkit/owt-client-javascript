#!/usr/bin/groovy

pipeline {
    agent any
    stages {
        stage('Build package') {
            steps {
                podTemplate(label: 'jenkins-pipeline', containers: [
                    containerTemplate(name: 'build1', image: 'webrtctest1.sh.intel.com/library/mcu-build-centos:7.4',  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat')
                ]){
                    node ('jenkins-pipeline') {
                        stage ('MCU package') {

                          container ('build1') {
                            sh "ls /home/jenkins/workspace"
                            sh "cat"
                          }
                        }
                    }
                }
            }
        }
    }
}