#!/bin/bash
# create certificate
#please go to your webrtc-woogeen-2 code
if [ $# != 2 ]; then
  echo "USAGE: this script will help you setup local automation enviroment to support https connection"
  echo  "$0 <webrtc-woogeen-2 full_path>, $1 <p2p server full_path>"
  exit 1;
fi
cd $0
sed 's/webrtc.intel.com/localhost/g' ./scripts/keyutil.sh > ./script/keyutil_1.sh
sed 's/${OPENSSL_BIN}/open/g' ./scripts/keyutil_temp.sh > ./scripts/keyutil_2.sh
chmod +x ./scripts/keyutil_2.sh
./scripts/keyutil_2.sh 
#copy cert to p2p server  cert
cp -r ./cert/cert.pem  $1/cert 
# Add a personal certificate and private key for SSL client authentication  8
pk12util -d sql:$HOME/.pki/nssdb -i ${abPath}/ $0/cert/certificate.pfx
#to trust a self-signed server certificate 
certutil -d sql:$HOME/.pki/nssdb -A -t "P,," -n 'localhost - Intel' -i $1/cert/cert.pem 
