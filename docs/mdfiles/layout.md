Customized video layout
---------------------
# {#layout}
The MCU server supports the mixed video layout configuration which is compliant with RFC5707 Media Server Markup Language (MSML). <br>
A valid customized video layout should be a JSON string which represents an array of video layout definition.<br>
~~~~~~{.js}
//Example of customized video layout
[
//layout 1: 1 input
 {
 "region": [
      {
        "id": "1",  //main pane
        "shape": "rectangle",
        "area": {
            "left": 0,  //numbers will be converted to rational object { "numerator": a, "denominator": b }, string value like "1/3" is also supported.
            "top": 0,
            "width": 1,
            "height": 1
        }
      }
    ]
  },
//layout 2: 2 inputs
 {
  "region": [
     {
        "id": "1",  //main pane
        "shape": "rectangle",
        "area": {
            "left": 0,
            "top": 0.25,
            "width": 0.5,
            "height": 0.5
        }
     },
     {
        "id": "2",
        "shape": "rectangle",
        "area": {
            "left": 0.5,
            "top": 0.25,
            "width": 0.5,
            "height": 0.5
        }
     }
   ]
  },
 //layout 3: 6 inputs
 {
 "region": [
      {
        "id": "1",   //main pane
        "shape": "rectangle",
        "area": {
            "left": 0,
            "top": 0,
            "width": 0.667,
            "height": 0.667
        }
      },
      {
        "id": "2",
        "shape": "rectangle",
        "area": {
            "left": 0.667,
            "top": 0,
            "width": 0.333,
            "height": 0.333
        }
      },
      {
        "id": "3",
        "shape": "rectangle",
        "area": {
            "left": 0.667,
            "top": 0.333,
            "width": 0.333,
            "height": 0.333
        }
      },
      {
        "id": "4",
        "shape": "rectangle",
        "area": {
            "left": 0.667,
            "top": 0.667,
            "width": 0.333,
            "height": 0.333
        }
      },
      {
        "id": "5",
        "shape": "rectangle",
        "area": {
            "left": 0.333,
            "top": 0.667,
            "width": 0.333,
            "height": 0.333
        }
      },
      {
        "id": "6",
        "shape": "rectangle",
        "area": {
            "left": 0,
            "top": 0.667,
            "width": 0.333,
            "height": 0.333
        }
      }
    ]
  }
]
~~~~~~
Each "region" defines video panes that are used to display participant video streams.<br>
Regions are rendered on top of the root mixed stream. "id" is the identifier for each video layout region.<br>
The size of a region is specified relative to the size of the root mixed stream using the "relativesize" attribute.<br>
Regions are located on the root window based on the value of the position attributes "top" and "left".  These attributes define the position of the top left corner of the region as an offset from the top left corner of the root mixed stream, which is a percent of the vertical or horizontal dimension of the root mixed stream.<br>
Here are the illustration of 3 example layouts. Each number in a white squre indicates the defined id of that video pane.<br>
<img src="layout1.png"  alt="layout 1: 1 input" /><br>
Layout 1 only defines one video pane.<br>
<img src="layout2.png"  alt="layout 2: 2 input" /><br>
Layout 2 only defines two video panes and the black areas are with no contents.<br>
<img src="layout3.png"  alt="layout 3: 6 input" /><br>
Layout 3 defines six vidio panes, a bigger one surrouded by other 5 panes.<br>

> **Note:**
1. A 'base' layout template will be replaced by your defined customized video layout while there are conflicts.
2. It will automatically select the most suitable layout as with the changing of participator number. For instance, defining a layout as the above example with the 'base' set to 'void'. When only one user joins, layout 1 will be selected. After another user joins, layout will be replaced by layout 2. If more than 2 users are joining, layout 6 will be the most suitable choice.
3. Original definition in RFC5707 maintains a 'priority' option to indicates drawing order of the video spanes. Instead, the order within a layout definition will be considered as the drawing order and no explicit option is needed. And latter drawed panes will cover previous ones if overlaping exists.
4. One layout has a main pane defining its 'id' to be 1.
