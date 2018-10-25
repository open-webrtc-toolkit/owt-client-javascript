#!/usr/bin/groovy

pipeline {
    agent any
    stages {
        stage('Build package') {
            steps {
                podTemplate(name: 'pack', label: 'jenkins-pipeline', containers: [
                    containerTemplate(name: 'build1', image: 'webrtctest1.sh.intel.com/library/mcu-build-centos:7.4',  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat')
                ]){
                    node ('jenkins-pipeline') {
                      container ('build1') {
                        sh "ls /home/jenkins/workspace"
                        sh "cat"
                      }
                    }
                }
            }
        }
    }

    stage('Start test') {
        parallel{
            stage('API') {
                podTemplate(name: 'APItest', label: 'test1', runAsUser: 0, fsGroup: 0, cloud: 'kubernetes', containers: [
                    containerTemplate(name: 'test1', image: 'webrtctest1.sh.intel.com/library/karma-mcu:base',  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat'),
                    ]) {
                
                    node('test1') {
                      container('test1') {
                        stage('Test MCU 1') {
                           //sh '/root/start.sh 10.244.0.121 10.244.0.122 $GIT_COMMIT"1" ConferenceClient_api'
                           sh 'ls -l /root/'
                        }
                      }
                    }
                }
            }
            
            stage('Subscribe') {
                podTemplate(name:'Subtest', label: 'test2', runAsUser: 0, fsGroup: 0, cloud: 'kubernetes', containers: [
                    containerTemplate(name: 'test2', image: 'webrtctest1.sh.intel.com/library/karma-mcu:base',  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat'),
                    ]) {
                
                    node('test2') {
                      container('test2') {
                        stage('Test MCU 1') {
                            //sh '/root/start.sh 10.244.0.121 10.244.0.122 $GIT_COMMIT"2" ConferenceClient_subscribe'
                            sh 'ls'
                            
                        }
                      }
                    }
                }
            }
        }
    }
}