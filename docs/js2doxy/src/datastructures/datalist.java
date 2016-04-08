package datastructures;

import java.io.*;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;

/**
 * Created by bean on 29/11/15.
 */
public class datalist {
    public HashMap<String, jsnamespace> namespaces;//jsdocname
    public HashMap<String, jsclass> classes;//jsdocclassname, whole path
    public HashSet<jsfunction> functions;
    public HashMap<String,HashSet<jsfunction>> functionGroup;
    public datalist(){
        namespaces=new HashMap<String, jsnamespace>();
        classes=new HashMap<String,jsclass>();
        functions=new HashSet<jsfunction>();
        functionGroup=new HashMap<String, HashSet<jsfunction>>();
    }
    public void scanBlockInFile(String jsfiles) throws Exception {
        //TODO:resolve links
        BufferedReader reader=new BufferedReader(new FileReader(jsfiles));
        commentBlock process=new commentBlock();
        jsclass clsprocess=new jsclass();
        jsfunction funcprocess=new jsfunction();
        jsnamespace npprocess=new jsnamespace();
        String line;
        String block="";
        boolean blockFlag=false;
        while((line=reader.readLine())!=null){
            if(line.trim().contains("/**")){
                blockFlag=true;
            }
            if(blockFlag&&line.trim().contains("*/")){
                block+=line+"\n";
//                System.out.println("===================");
//                System.out.println(block);
//                System.out.println("===================");
                //process
                commentBlock ret=process.parseTagMap(block);
                if(ret==null){
//                    System.out.println("=====abondon block:"+block);
                }else if(ret.type== commentBlock.blockType.CLASS){
                    jsclass cls= (jsclass) clsprocess.transform(ret);
                    classes.put(cls.jsname, cls);
                }else if(ret.type== commentBlock.blockType.NAMESPACE){
                    jsnamespace np=(jsnamespace) npprocess.transform(ret);
                    namespaces.put(np.name, np);
                }else if(ret.type== commentBlock.blockType.FUNCTION){
                    jsfunction fun=(jsfunction) funcprocess.transform(ret);
                    functions.add(fun);
                }else{
//                    System.out.println("=====abondon block:"+ret.type+"\n"+block);
                }
                block="";
                blockFlag=false;
                continue;
            }
            if(blockFlag){
                block+=line+"\n";
            }
        }
        reader.close();
    }
    public void scanAllBlock(String[] files) throws Exception {
        for(String file:files){
            scanBlockInFile(file);
        }
        //process function group
        for(jsfunction func:functions){
            String[] clsnames=func.classname.split("&");
            //System.out.println("clsnames.size:"+clsnames.length);
            for(String clsname:clsnames){
                if(!classes.containsKey(clsname)){
                    throw new Exception(clsname + " not found for function "+func.name);
                }else{
                    if(functionGroup.containsKey(clsname)){
                        HashSet<jsfunction> set=functionGroup.get(clsname);
                        set.add(func);
                    }else{
                        HashSet<jsfunction> set=new HashSet<jsfunction>();
                        set.add(func);
                        functionGroup.put(clsname, set);
                    }
                }
            }
        }
    }

    public void writePseudoClassFile() throws Exception {
        Iterator iterator = functionGroup.entrySet().iterator();
        while(iterator.hasNext()){
            Map.Entry<String, HashSet<jsfunction>> entry= (Map.Entry<String, HashSet<jsfunction>>) iterator.next();
            jsclass curclass=classes.get(entry.getKey());
            if(!namespaces.containsKey(curclass.namespace)){
                throw new Exception(curclass.namespace+" not found for class "+curclass.name);
            }
            jsnamespace curspace=namespaces.get(curclass.namespace);
            File out =new File("js_"+curclass.name+".java");
            if(!out.exists()){
                out.createNewFile();
            }
            System.out.println("====class:"+curclass.name+","+entry.getValue().size()+"functions:");
            FileWriter fw=new FileWriter(out);
            fw.write(curspace.toString());
            fw.write(curclass.classBeginStr());
            for(jsfunction func:entry.getValue()){
                fw.write(func.toString());
                System.out.println("+:"+func.name);
            }
            fw.write(curclass.classEndStr());
            fw.close();
        }
    }
    public static void main(String args[]) throws Exception {
//        String[] jsfiles={"peer.js", "conference.js", "events.js", "N.API.js", "stream.js", "ui.js"};
        datalist test=new datalist();
//        test.scanAllBlock(jsfiles);
        test.scanAllBlock(args);
        test.writePseudoClassFile();
    }
}
