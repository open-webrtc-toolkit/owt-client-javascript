package datastructures;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Created by bean on 29/11/15.
 */
public class commentBlock {
    public boolean log = false;

    public enum blockType {NOTDEF, NAMESPACE, CLASS, FUNCTION}

    public HashMap<String, String> tagContentMap;
    public ArrayList<String> paramSet;
    public blockType type;

    public commentBlock() {
        tagContentMap = new HashMap<String, String>();
        paramSet=new ArrayList<String>();
        type = blockType.NOTDEF;
    }

    /*
    tag set:
    @namespace
    @classDesc
    @class
    @extends
    @function
    @desc
    @private
    @static
    @instance
    @memberOf
    @param
    @return
    @example
     */
    public commentBlock parseTagMap(String comment) {
        String lines[] = comment.split("\n");
        commentBlock block = new commentBlock();
        String tag = "";
        String content = "";
        for (String line : lines) {
            String trimLine = line.trim();
            String ret[] = getTag(trimLine);
            if (ret != null) {
                //tag line, push last tag span and update ret
                if (!tag.equals("")) {
                    block.addToMap(tag, content);
                }
                tag = ret[0];
                if (tag.equals("namespace") && block.type == blockType.NOTDEF) {
                    block.type = blockType.NAMESPACE;
                } else if (tag.equals("class") && block.type == blockType.NOTDEF) {
                    block.type = blockType.CLASS;
                } else if (tag.equals("function") && block.type == blockType.NOTDEF) {
                    block.type = blockType.FUNCTION;
                } else if (tag.equals("private")) {
                    //private block is not included.
                    block.type = blockType.NOTDEF;
                    break;
                }
                content = ret[1];
            } else if (trimLine.equals("*/")) {
                //add last tag span
                block.addToMap(tag, content);
            } else {
                //concat content
                content += line + "\n";
            }
        }
        if (block.type == blockType.NOTDEF) {
            if (log) {
                System.out.println("=====not a document comment:=====");
                System.out.println(comment);
                System.out.println("=================================");
            }
            return null;
        } else {
            return block;
        }
    }
    public void addToMap(String tag, String content){
        if(tag.equals("param")){
            paramSet.add(content);
        }else{
            tagContentMap.put(tag, content);
        }
    }

    public String[] getTag(String trimLine) {
        //TODO: move to static
        String tagPat = "\\*\\s*@([^\\s]+)\\s*([^\\n]*)\\n*";
        Pattern p = Pattern.compile(tagPat);
        Matcher m = p.matcher(trimLine);

        if (log) {
            System.out.println(trimLine);
        }
        if (m.find()) {
            if (log) {
                System.out.println("find:true");
                System.out.println("tag:" + m.group(1));
                if (m.groupCount() == 2) {
                    System.out.println("content:" + m.group(2));
                }
            }
            return new String[]{m.group(1), m.group(2)};
        }
        return null;
    }

    @Override
    public String toString() {
        String typestr = "NOTDEF";
        if (type == blockType.NAMESPACE) {
            typestr = "NAMESPACE";
        } else if (type == blockType.CLASS) {
            typestr = "CLASS";
        } else if (type == blockType.FUNCTION) {
            typestr = "FUNCTION";
        }
        String ret = "=================" + typestr + "\n";
        Iterator iterator = tagContentMap.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, String> entry = (Map.Entry<String, String>) iterator.next();
            ret += "---Tag:" + entry.getKey() + "\n---Content:" + entry.getValue() + "\n";
        }
        for(String paramcont:paramSet){
            ret += "---Tag:param\n---Content:" + paramcont + "\n";
        }
        return ret;
    }
}
