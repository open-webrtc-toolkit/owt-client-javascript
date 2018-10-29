
pipeline {
    agent any
    environment {
        MCU_IMAGE = 'webrtctest1.sh.intel.com/library/mcu-build-centos:update'
        KARMA_IMAGE = 'webrtctest1.sh.intel.com/library/karma-mcu:base'
    }
    stages {
        stage('Check') {
            steps {
                script {
                    sh 'printenv'
                }
            }
        }

        stage('Build package') {
            steps {
                podTemplate(name: 'pack', label: 'jenkins-pipeline', containers: [
                    containerTemplate(name: 'build1', image: 'webrtctest1.sh.intel.com/library/mcu-build-centos:update',  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat')
                ]){
                    node ('jenkins-pipeline') {
                      container ('build1') {
                        sh "/root/packSDKInDocker.sh software $env.GIT_COMMIT $env.CHANGE_BRANCH $env.GIT_BRANCH $env.CHANGE_ID"
                        sh "ls /root/scripts/dist/webrtc_agent/node_modules"
                      }
                    }
                }
            }
        }

        stage('Start test') {
            parallel {
                stage('API') {
                    steps {
                        podTemplate(name: 'APItest', label: 'test1', cloud: 'kubernetes', containers: [
                            containerTemplate(name: 'test1', image: 'webrtctest1.sh.intel.com/library/karma-mcu:base',  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat'),
                            ]) {
                        
                            node('test1') {
                              container('test1') {
                                   sh "/root/start.sh 10.244.0.121 10.244.0.122 ${env.GIT_COMMIT}1 ConferenceClient_api"
                                   sh 'ls -l /root/'
                              }
                            }
                        }
                    }
                }

                stage('Subscribe') {
                    steps {
                        podTemplate(name:'Subtest', label: 'test2', cloud: 'kubernetes', containers: [
                            containerTemplate(name: 'test2', image: 'webrtctest1.sh.intel.com/library/karma-mcu:base',  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat'),
                            ]) {
                        
                            node('test2') {
                              container('test2') {
                                    sh "/root/start.sh 10.244.0.121 10.244.0.122 ${env.GIT_COMMIT}2 ConferenceClient_subscribe"
                                    sh 'ls'
                              }
                            }
                        }
                    }
                }
            }
        }
    }
}
