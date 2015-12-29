package datastructures;

import java.util.HashMap;

/**
 * Created by bean on 29/11/15.
 */
public class jsclass implements transBlock {
    public String name;
    public String namespace;
    public String jsname;
    public String parent = null;
    public String description;

    @Override
    public transBlock transform(commentBlock cb) throws Exception {
        if (cb.type != commentBlock.blockType.CLASS) {
            Exception e = new Exception("Not a class block!");
            throw e;
        }
        jsclass ret = new jsclass();
        HashMap<String, String> cbtagmap = cb.tagContentMap;
        if (cbtagmap.containsKey("class")) {
            ret.jsname=cbtagmap.get("class");
            String resol[] = resolveName(ret.jsname);
            ret.namespace = resol[0];
            ret.name = resol[1];
        } else {
            Exception e = new Exception("No @class tag in map!");
            throw e;
        }
        if (cbtagmap.containsKey("classDesc")) {
            ret.description = cbtagmap.get("classDesc");
        } else {
            Exception e = new Exception("No @classDesc tag in map!");
            throw e;
        }
        if (cbtagmap.containsKey("extends")) {
            ret.parent = cbtagmap.get("extends");
        }
        return ret;
    }

    public String[] resolveName(String jsdocName) {
        String columns[] = jsdocName.split("\\.");
        String namespace = "";
        String name = "";
        name = columns[columns.length - 1];
        for (int i = 0; i < columns.length - 1; i++) {
            namespace += "." + columns[i];
        }
        namespace = namespace.substring(1);
        return new String[]{namespace, name};
    }

    @Override
    public String toString() {
        String ret = "/**\n" +
                " * " + description + "\n */\n" +
                "public class " + name;
        if (parent != null) {
            ret += " extends " + parent;
        }
        ret += "{}";
        return ret;
    }

    public String classBeginStr() {
        String ret = "/**\n" +
                " * " + description + "\n */\n" +
                "public class " + name;
        if (parent != null) {
            ret += " extends " + parent;
        }
        ret += "{\n";
        return ret;
    }

    public String classEndStr() {
        return "\n}";
    }
}
