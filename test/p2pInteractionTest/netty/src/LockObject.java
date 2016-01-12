public class LockObject {
    private String lock;
    public String getLock() {
        return lock;
    }

    public void setLock(String lock) {
        this.lock = lock;
    }

    public LockObject() {
    }

    public LockObject(String lock) {
        super();
        this.lock = lock;
    }
}
