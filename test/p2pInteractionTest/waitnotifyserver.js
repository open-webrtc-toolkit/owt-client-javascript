var beanLock = 'beanLock';
var beanTargetLock = 'beanTargetLock';
var wnsocket = io.connect('http://localhost:9092');
var printWait = true;
var wnconnectted = false;
wnsocket.on('connect', function() {
    console.log('connectted to the lock server!');
    wnconnectted = true;
});

wnsocket.on('disconnect', function () {
    console.log('disconnectted from the lock server');
    wnconnectted = false;
});

wnsocket.on('lockevent', function(data) {
    console.log('lock arrived:' + data.lock);
    beanLock = data.lock;
});

//may be called many time by waitsFor block
function waitLock(lockName) {
    expect(lockName).not.toBeNull();
    beanTargetLock = lockName;
    var jsonObject = {
        lock: lockName
    };
    wnsocket.emit('waitlock', jsonObject);
    if(printWait){
        console.log('wait for lock:' + lockName);
    }
    if(beanLock == beanTargetLock){
        //reset lock
        debug('get lock:'+beanLock);
        beanLock = 'beanLock';
        beanTargetLock = 'beanTargetLock';
        printWait=true;
        return true;
    }else{
        printWait=false;
    }
}

function notifyLock(lockName) {
    expect(lockName).not.toBeNull();
    debug('notify lock:'+lockName);
    var jsonObject = {
        lock: lockName
    };
    wnsocket.emit('lockevent', jsonObject);
}
