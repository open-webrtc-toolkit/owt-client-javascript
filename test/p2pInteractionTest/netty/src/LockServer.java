
import com.corundumstudio.socketio.listener.*;
import com.corundumstudio.socketio.*;

public class LockServer {
    private SocketIOServer server;
    private LockObject curLock = new LockObject("init lock");
    private int resendInterval = 500;
    boolean resendFlag = true;
    // TODO: this should be read in config file
    private String shellPath = "/bin/sh";

    public void start() {
        Configuration config = new Configuration();
        config.setHostname("localhost");
        config.setPort(9092);

        server = new SocketIOServer(config);
        server.addConnectListener(new ConnectListener() {
            @Override
            public void onConnect(SocketIOClient client) {
                LockObject data = new LockObject("server received connect!");
                client.sendEvent("lockevent", data);
            }
        });
        server.addEventListener("lockevent", LockObject.class, new DataListener<LockObject>() {
            @Override
            public void onData(SocketIOClient client, LockObject data, AckRequest ackRequest) {
                // broadcast messages to all clients
                server.getBroadcastOperations().sendEvent("lockevent", data);
                curLock = data;
            }
        });
        server.addEventListener("waitlock", LockObject.class, new DataListener<LockObject>() {
            @Override
            public void onData(SocketIOClient client, LockObject data, AckRequest ackRequest) {
                server.getBroadcastOperations().sendEvent("waitlock", data);
            }
        });
        server.start();
        initResendThead();
        try {
            Thread.sleep(Integer.MAX_VALUE);
        } catch (Exception e) {
            server.stop();
        }
    }

    public void initResendThead() {
        new Thread() {
            public void run() {
                resendFlag = true;
                while (resendFlag) {
                    try {
                        currentThread();
                        Thread.sleep(resendInterval);
                        // System.out.println("resend lock:"+curLock.getLock());
                        server.getBroadcastOperations().sendEvent("lockevent", curLock);
                    } catch (Exception e) {
                        resendFlag = false;
                        System.out.println("resendFlag: set false");
                    }
                }
            }
        }.start();
    }
}
