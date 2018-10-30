
pipeline {
    agent any
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
                    containerTemplate(name: 'CentOSPack', image: "$env.PACK_IMAGE",  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat')
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
                stage('APITest') {
                    steps {
                        podTemplate(name: 'APITest', label: 'ConferenceTest', cloud: 'kubernetes', containers: [
                            containerTemplate(name: 'APITest', image: "$env.TEST_IMAGE",  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat'),
                            ]) {
                        
                            node('test1') {
                              container('test1') {
                                   sh "/root/start.sh $env.RABBITMQ $env.MONGODB ${env.GIT_COMMIT}1 ConferenceClient_api"
                                   sh 'ls -l /root/'
                              }
                            }
                        }
                    }
                }

                stage('SubscribeTest') {
                    steps {
                        podTemplate(name:'SubscribeTest', label: 'COnferenceTest', cloud: 'kubernetes', containers: [
                            containerTemplate(name: 'SubscribeTest', image: "$env.TEST_IMAGE",  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat'),
                            ]) {
                        
                            node('test2') {
                              container('test2') {
                                    sh "/root/start.sh $RABBITMQ $env.MONGODB ${env.GIT_COMMIT}2 ConferenceClient_subscribe"
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
