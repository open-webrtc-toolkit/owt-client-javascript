package datastructures;

import java.util.ArrayList;
import java.util.HashMap;

/**
 * Created by bean on 29/11/15.
 */
public class jsfunction implements transBlock {
    public String name;
    public String description;
    public String classname;
    public boolean statiflag;
    public ArrayList<String[]> paramResolveSet = new ArrayList<String[]>();
    public ArrayList<String> paramSet;
    public String[] returnResolve = null;

    public String example = null;

    @Override
    public transBlock transform(commentBlock cb) {
        jsfunction ret = new jsfunction();
        try {
            if (cb.type != commentBlock.blockType.FUNCTION) {
                Exception e = new Exception("Not a function block!");
                throw e;
            }
            HashMap<String, String> cbtagmap = cb.tagContentMap;
            ret.paramSet = cb.paramSet;
            for (String paramstr : cb.paramSet) {
                ret.paramResolveSet.add(resoveParamStr(paramstr));
            }
            if (cbtagmap.containsKey("function")) {
                ret.name = cbtagmap.get("function");
            } else {
                Exception e = new Exception("No @function tag in map!");
                throw e;
            }
            if (cbtagmap.containsKey("desc")) {
                ret.description = cbtagmap.get("desc");
            } else {
                Exception e = new Exception("No @desc tag in function map!");
                throw e;
            }
            if (cbtagmap.containsKey("static")) {
                ret.statiflag = true;
            }
            if (cbtagmap.containsKey("memberOf")) {
                ret.classname = cbtagmap.get("memberOf");
            } else {
                Exception e = new Exception("No @memberOf tag in function map!");
                throw e;
            }
            if (cbtagmap.containsKey("example")) {
                ret.example = cbtagmap.get("example");
            }
            if (cbtagmap.containsKey("return")) {
                ret.returnResolve = resoveReturnStr(cbtagmap.get("return"));
            }

        } catch (Exception e) {
            System.out.println("ErrorBlock!\n" + cb);
        }
        return ret;
    }

    @Override
    public String toString() {
        String ret = "/**\n" +
                " * " + description + "\n";
        String argulist = "";
        for (String[] paramitem : paramResolveSet) {
            ret += " * @param " + paramitem[1] + " " + paramitem[2] + "\n";
            argulist += ", " + paramitem[0] + " " + paramitem[1].replaceAll("\\([^\\)]*\\)","");
        }
        if (returnResolve != null) {
            ret += " * @return " + returnResolve[1] + "\n";
        }
        if (example != null) {
            ret += " <br><br>\n* @code\n" +
                    example + "\n" +
                    " * @endcode\n";
        }
        ret += "*/\n";
        ret += "public ";
        if (statiflag) {
            ret += "static ";
        }
        if (returnResolve != null) {
            ret += returnResolve[0] + " ";
        } else {
            ret += "void ";
        }
        ret += name + "(";
        if(!argulist.equals("")){
            ret += argulist.substring(1);
        }
        ret += "){};\n";
        return ret;
    }

    public String[] resoveParamStr(String paramstr) {
        int leftbrac = paramstr.indexOf("{");
        int rightbrac = paramstr.indexOf("}");
        int split1 = paramstr.indexOf(" ", rightbrac + 1);
        int split2 = paramstr.indexOf(" ", split1 + 1);
        try {
            String type = paramstr.substring(leftbrac + 1, rightbrac);
            String name = paramstr.substring(split1 + 1, split2);
            String desc = paramstr.substring(split2 + 1);
            return new String[]{type, name, desc};
        } catch (Exception e) {
            System.out.println("Error reloving params:" + paramstr);
            e.printStackTrace();
        }
        return null;
    }

    public String[] resoveReturnStr(String returnstr) {
        int split1 = returnstr.indexOf(" ", returnstr.indexOf("@return"));
        int leftbrac = returnstr.indexOf("{");
        int rightbrac = returnstr.indexOf("}");
        try {
            String type = returnstr.substring(leftbrac + 1, rightbrac);
            String desc = returnstr.substring(split1 + 1);
            return new String[]{type, desc};
        } catch (Exception e) {
            System.out.println("Error reloving @return:" + returnstr);
            e.printStackTrace();
        }
        return null;
    }
}
