
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
                    node ('CentOSPack') {
                      container ('CentOSPack') {
                        sh "/root/packSDKInDocker.sh software $env.GIT_COMMIT $env.CHANGE_BRANCH $env.GIT_BRANCH $env.CHANGE_ID"
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
                        
                            node('APITest') {
                              container('APITest') {
                                   sh "/root/start.sh $env.RABBITMQ $env.MONGODB ${env.GIT_COMMIT}1 ConferenceClient_api"
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
                        
                            node('SubscribeTest') {
                              container('SubscribeTest') {
                                    sh "/root/start.sh $RABBITMQ $env.MONGODB ${env.GIT_COMMIT}2 ConferenceClient_subscribe"
                              }
                            }
                        }
                    }
                }
            }
        }
    }
}
