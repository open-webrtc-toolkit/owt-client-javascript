pipeline {
  stages{
    def label = "mypod-${UUID.randomUUID().toString()}"
    stage('Build MCU') {
        podTemplate(label: label, runAsUser: 0, fsGroup: 0, cloud: 'kubernetes', containers: [
            containerTemplate(name: 'build1', image: 'webrtctest1.sh.intel.com/library/mcu-build-centos:7.4',  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat'),
            ]) {
        
            node(label) {
              container('build1') {
                stage('Test MCU 1') {
                  sh 'ls /var/jenkins_home/workspace'
                  sh 'echo "Running ${env.BUILD_ID} on ${env.JENKINS_URL}"'
                  sh '/root/packSDKInDocker.sh software $GIT_COMMIT'
                  sh 'ls /root/scripts/dist/webrtc_agent/node_modules'
                }
              }
            }
        }
    }

    stage('Start test') {
        parallel(
            'API':{
                podTemplate(label: 'test1', runAsUser: 0, fsGroup: 0, cloud: 'kubernetes', containers: [
                    containerTemplate(name: 'test1', image: 'webrtctest1.sh.intel.com/library/karma-mcu:base',  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat'),
                    ]) {
                
                    node('test1') {
                      container('test1') {
                        stage('Test MCU 1') {
                           sh '/root/start.sh 10.244.0.121 10.244.0.122 $GIT_COMMIT"1" ConferenceClient_api'
                           sh 'ls -l /root/'
                        }
                      }
                    }
                }
            },
            'Subscribe':{
                podTemplate(label: 'test2', runAsUser: 0, fsGroup: 0, cloud: 'kubernetes', containers: [
                    containerTemplate(name: 'test2', image: 'webrtctest1.sh.intel.com/library/karma-mcu:base',  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat'),
                    ]) {
                
                    node('test2') {
                      container('test2') {
                        stage('Test MCU 1') {
                            sh '/root/start.sh 10.244.0.121 10.244.0.122 $GIT_COMMIT"2" ConferenceClient_subscribe'
                            sh 'ls'
                            
                        }
                      }
                    }
                }
            }
        )
    }
  }
}
