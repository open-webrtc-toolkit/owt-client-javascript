
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
                    containerTemplate(name: 'centospack', image: "$env.PACK_IMAGE",  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat')
                ]){
                    node ('jenkins-pipeline') {
                      container ('centospack') {
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
                        podTemplate(name: 'apitest', label: 'apitest', cloud: 'kubernetes', containers: [
                            containerTemplate(name: 'apitest', image: "$env.TEST_IMAGE",  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat'),
                            ]) {
                        
                            node('apitest') {
                              container('apitest') {
                                   sh "/root/start.sh $env.RABBITMQ $env.MONGODB ${env.GIT_COMMIT}1 ConferenceClient_api"
                              }
                            }
                        }
                    }
                }

                stage('SubscribeTest') {
                    steps {
                        podTemplate(name:'subscribetest', label: 'subscribetest', cloud: 'kubernetes', containers: [
                            containerTemplate(name: 'SubscribeTest', image: "$env.TEST_IMAGE",  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat'),
                            ]) {
                        
                            node('subscribetest') {
                              container('subscribetest') {
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
