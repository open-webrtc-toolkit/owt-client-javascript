"use strict"
var xmlreader=require("xmlreader");
var fs = require("fs");

var argv = process.argv.slice(2);
console.log("argus is: ", argv);


function analysis (filePath){
  var content = fs.readFileSync(filePath, "utf-8");
  var totalCase = 0, failures = 0, errors = 0, allLogs = "";
  var failedCaseNum = [], failedCaseName = [];
  xmlreader.read(content, (err, resp)=>{
    if(err){
      throw new Error(`read file ${filePath} err: ${err}`);
    }else{
       let testsuites = resp.testsuites || resp.testsuite;
       testsuites.each((index,item)=>{
         let attrs = item.attributes();
         totalCase += attrs.tests;
         failures += attrs.failures;
         errors += attrs.errors;
         item.testcase.each((index, itemCase)=>{
           if(itemCase.failure){
               let parentAttrs = itemCase.attributes();
               let text = itemCase.failure.text();
               console.log(`    case name: ${parentAttrs.name} \n    failure info: ${text}`);
               //console.log(content);
               //console.log('0000000', index, itemCase);
           }
         });
       });
       console.log(`results: totalCase ${totalCase}, failures ${failures}, errors ${errors}`);
       if(parseInt(failures) > 0 || parseInt(errors) > 0){
           console.log('unit test failed');
           process.exit(2);
       }

    }

  })
}

console.log("start analysising result......");

argv.forEach((filePath)=>{
  console.log(`Analysis ${filePath}.........`);
  analysis(filePath);
});
