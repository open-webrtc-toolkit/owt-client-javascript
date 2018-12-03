
void setBuildStatus() {
    step([
          $class: "GitHubCommitStatusSetter",
          reposSource: [$class: "ManuallyEnteredRepositorySource", url: "https://github.com/open-media-streamer/oms-client-javascript"],
          contextSource: [$class: "ManuallyEnteredCommitContextSource", context: "ci/conference/build-status"]
      ]);
    }

 setBuildStatus()

pipeline {
    agent any

    stages {
        stage('Build package') {
            steps {
                podTemplate(name: 'pack', label: 'pack-mcu', containers: [
                    containerTemplate(name: 'pack-on-centos', image: "$env.PACK_IMAGE",  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat')
                ]){
                    node ('pack-mcu') {
                      container ('pack-on-centos') {
                        sh "/root/packSDKInDocker.sh software $env.CHANGE_BRANCH $env.GIT_BRANCH $env.CHANGE_ID"
                      }
                    }
                }
            }
        }

        stage('Start test') {
            parallel {
                stage('API test') {
                    steps {
                        podTemplate(name: 'api-test', label: 'api-test', cloud: 'kubernetes', containers: [
                            containerTemplate(name: 'api-test', image: "$env.TEST_IMAGE",  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat'),
                            ]) {
                        
                            node('api-test') {
                              container('api-test') {
                                   sh "/root/start.sh ${env.GIT_BRANCH}1 ConferenceClient_api"
                              }
                            }
                        }
                    }
                }

                stage('Subscribe test') {
                    steps {
                        podTemplate(name:'subscribe-test', label: 'subscribe-test', cloud: 'kubernetes', containers: [
                            containerTemplate(name: 'subscribe-test', image: "$env.TEST_IMAGE",  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat'),
                            ]) {
                        
                            node('subscribe-test') {
                              container('subscribe-test') {
                                  sh "/root/start.sh ${env.GIT_BRANCH}2 ConferenceClient_subscribe"
                              }
                            }
                        }
                    }
                }
            }
        }
    }
}
