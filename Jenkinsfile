#!/usr/bin/groovy

// load pipeline functions
// Requires pipeline-github-lib plugin to load library from github
@Library('github.com/lachie83/jenkins-pipeline@master')
def pipeline = new io.estrado.Pipeline()

podTemplate(label: 'jenkins-pipeline', containers: [
    ccontainerTemplate(name: 'build1', image: 'webrtctest1.sh.intel.com/library/mcu-build-centos:7.4',  ttyEnabled: true, alwaysPullImage: true, privileged: true, network: 'host', command: 'cat')
]){
    node ('jenkins-pipeline') {
        pipeline.gitEnvVars()
        stage ('Maven Build & Tests') {

          container ('build1') {
            sh "ls /var/jenkins_home/workspace/"
          }
        }
    }
}