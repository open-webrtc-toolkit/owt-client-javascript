var beanLock = 'beanLock';
var beanLock_control = 'beanLock'
var beanTargetLock = 'beanTargetLock';
var sendactionLock = 'beansendLock';
var sendcontrolLock = 'beansendLock';
var wnsocket_action = io.connect('http://10.239.44.86:9092');
var wnsocket_control = io.connect('http://10.239.44.86:9091');
var printWait = true;
var wnconnectted = false;
wnsocket_action.on('connect', function() {
    console.log('connectted to the lock server!');
    wnconnectted = true;
});

wnsocket_action.on('disconnect', function () {
    console.log('disconnectted from the lock server');
    wnconnectted = false;
});

wnsocket_action.on('lockevent', function(data) {
    console.log('actionserver lock arrived:' + data.lock);
    beanLock = data.lock;
});

wnsocket_action.on('waitactionlock', function(data) {
    console.log('actionserver lock arrived:' + data.lock);
    sendactionLock = data.lock;
});

wnsocket_control.on('connect', function() {
    console.log('connectted to the lock server!');
    wnconnectted = true;
});

wnsocket_control.on('disconnect', function () {
    console.log('disconnectted from the lock server');
    wnconnectted = false;
});

wnsocket_control.on('controlevent', function(data) {
    console.log('controlserver lock arrived:' + data.lock);
    beanLock_control = data.lock;
});

wnsocket_control.on('waitcontrollock', function(data) {
    //console.log('actionserver lock arrived:' + data.lock);
    sendcontrolLock = data.lock;
});

//may be called many time by waitsFor block
function waitLock(lockName) {
    expect(lockName).not.toBeNull();
    beanTargetLock = lockName;
    var jsonObject = {
        lock: lockName
    };
    wnsocket_action.emit('waitlock', jsonObject);
    wnsocket_control.emit('waitlock', jsonObject);
    if(printWait){
        console.log('wait for lock:' + lockName);
    }
    if(sendactionLock == beanTargetLock || sendcontrolLock == beanTargetLock){
        //reset lock
        debug('get lock:'+beanLock);
        sendactionLock = 'beansendLock';
        sendcontrolLock = 'beansendLock';
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
    wnsocket_action.emit('lockevent', jsonObject);

}
