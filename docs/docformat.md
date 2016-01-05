comment template
================
1. Namespace
------------

/**
 * @namespace <namespace NAME>
 * @classDesc <namespace DESCRIPTION>
 */

2. Class
------------

/**
 * @class <CLASS NAME>
 * @classDesc <CLASS DESCRIPTION>
 */

3. Function
------------

//remember not to define multiple @desc in one function block
//example should be the final part
//class name should be whole path: <namespace.classname>
//return type is necessary
/**
   * @function <FUNCTIONNAME>
   * @desc <FUNCTIONDESCRIPTION>
   * (optional)<br><b>Remarks:</b><br>
   * (optional)@private
   * (optional)@static/instance
   * @memberOf <CLASS NAME>
   * @param {TYPE} NAME DESCRIPTION.
   * @return {TYPE} DESCRIPTION.
   * @example
LINES OF EXAMPLES
   */

4. Example HTML table
------------
//class must be params to enable our style
//table should in a @htmlonly, @endhtmlonly block
//table class set to be "doxtable"
@htmlonly
<table class="doxtable">
<caption><b>Table 1: Styled Table</b></caption>
    <tbody>
    <thead>
        <tr>
            <th><b>Head 1</b></th>
            <th><b>Head 2</b></th>
        </tr>
    </thead>
        <tr>
            <td>content 1</td>
            <td>content 2</td>
        </tr>
         <tr>
            <td>content 3</td>
            <td>content 4</td>
        </tr>
    </tbody>
</table>
@endhtmlonly

5. Example HTML unordered list
------------

<ul>
    <li>list item 1.</li>
    <li>list item 2.</li>
</ul>

6. Example HTML ordered list
------------

<ol>
    <li>list item 1.</li>
    <li>list item 2.</li>
</ol>

7. Link example
------------

//<classname>.funcname or <namespace>.funcname is the path of a function.
//after @link tag, first argument is path and second argument is label.
+ Example of http link : {@link https://software.intel.com/sites/landingpage/webrtc/# WebRTC}<br>
+ Example of inner link to class : {@link Webrtc.JsdocDemo Webrtc.JsdocDemo}<br>
+ Example of inner link to function : {@link Webrtc.JsdocDemo.NormalFunc Webrtc.JsdocDemo.NormalFunc()}

TODO: markdown file notices
