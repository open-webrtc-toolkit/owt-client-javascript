package datastructures;

import java.util.HashMap;

/**
 * Created by bean on 29/11/15.
 */
public class jsnamespace implements transBlock {
    public boolean log = false;
    public String name = null;
    public String description = null;

    @Override
    public transBlock transform(commentBlock cb) throws Exception {
        if (cb.type != commentBlock.blockType.NAMESPACE) {
            Exception e = new Exception("Not a namespace block!");
            throw e;
        }
        jsnamespace ret = new jsnamespace();
        HashMap<String, String> cbtagmap = cb.tagContentMap;
        if (cbtagmap.containsKey("namespace")) {
            ret.name = cbtagmap.get("namespace");
        } else {
            Exception e = new Exception("No @namespace tag in map!");
            throw e;
        }
        if (cbtagmap.containsKey("classDesc")) {
            ret.description = cbtagmap.get("classDesc");
        } else {
            Exception e = new Exception("No @classDesc tag in namespace "+cb.tagContentMap.get("namespace"));
            throw e;
        }
        return ret;
    }

    @Override
    public String toString() {
        String ret = "/**\n" +
                " * " + description + "\n" +
                " */\n" +
                "package " + name + ";\n";
        return ret;
    }
}
