//KittenPlaypen2.js
//Author: Leesha Maliakal

//Sources --------------------------------------------------------
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda
// BasicShapes.js and JTLookAtTrianglesWithKeys_ViewVolume.js by Northwestern Univ. Jack Tumblin

// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ProjMatrix * u_ViewMatrix * a_Position;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// Global Variables-------------------------------------------
var ANGLE_STEP = 45.0;		// Rotation angle rate (degrees/second)
var floatsPerVertex = 7;	// # of Float32Array elements used for each vertex: (x,y,z,w)position + (r,g,b)color
var g_EyeX = 0.20, g_EyeY = 0.25, g_EyeZ = 0.25; //Eye position (.20, .25, .25)

function main() {
//==============================================================================
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Set the vertex coordinates and color
  var n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Enable 3D depth-test when drawing: don't over-draw at any pixel unless the new Z value is closer to the eye than the old one..
  gl.enable(gl.DEPTH_TEST); 	  
	
  // Get the storage locations of u_ViewMatrix and u_ProjMatrix variables
  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  if (!u_ViewMatrix || !u_ProjMatrix) {
	  console.log('Failed to get u_ViewMatrix or u_ProjMatrix');
  return;
}


  // Create a local version of our view matrix in JavaScript 
  var viewMatrix = new Matrix4();
  
  // Create, init current rotation angle value in JavaScript
  var currentAngle = 0.0;

  // Create the matrix to specify the viewing volume and pass it to u_ProjMatrix
  var projMatrix = new Matrix4();
  projMatrix.setOrtho(-1.0, 1.0, -1.0, 1.0, 0.0, 2.0);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

//-----------------  

  // Start drawing: create 'tick' variable whose value is this function:
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
    draw(gl, n, currentAngle, u_ViewMatrix, viewMatrix);   // Draw shapes
    // report current angle on console
    //console.log('currentAngle=',currentAngle);
    requestAnimationFrame(tick, canvas);   
    									// Request that the browser re-draw the webpage
  };
  tick();							// start (and continue) animation: draw current image
	
}

function initVertexBuffer(gl) {
//==============================================================================
// Create one giant vertex buffer object (VBO) that holds all vertices for all
// shapes.

    // Make each 3D shape in its own array of vertices:
    makeSphere();						// create, fill the sphVerts array
    makeGroundGrid();				// create, fill the gndVerts array
    makeCube();                   //create, fill the cubeVerts array

    // how many floats total needed to store all shapes?
	var mySiz = (cubeVerts.length + sphVerts.length + gndVerts.length);						

	// How many vertices total?
	var verts = mySiz / floatsPerVertex;
	console.log('number of verts is', verts, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);

	// Copy all shapes into one big Float32 array:
	var colorShapes = new Float32Array(mySiz);

	// Copy them:  remember where to start for each shape:
	cubeStart = 0;							// we stored the cube first.
     for(i=0,j=0; j< cubeVerts.length; i++,j++) {
        colorShapes[i] = cubeVerts[j];
     }

    sphStart = i;						// next, we'll store the sphere;
    for (j=0; j < sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
        colorShapes[i] = sphVerts[j];
    }

	gndStart = i;						// next we'll store the ground-plane;
	for(j=0; j< gndVerts.length; i++, j++) {
		colorShapes[i] = gndVerts[j];
	}

    // Create a buffer object on the graphics hardware:
    var shapeBufferHandle = gl.createBuffer();  
    if (!shapeBufferHandle) {
        console.log('Failed to create the shape buffer object');
    return false;
    }
    
    // Bind the the buffer object to target:
    gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);

    // Transfer data from Javascript array colorShapes to Graphics system VBO
    // (Use sparingly--may be slow if you transfer large shapes stored in files)
    gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);
    
    //Get graphics system's handle for our Vertex Shader's position-input variable: 
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
    return -1;
    }

    // how many bytes per stored value?
    var FSIZE = colorShapes.BYTES_PER_ELEMENT; 

    // Use handle to specify how to retrieve **POSITION** data from our VBO:
    gl.vertexAttribPointer(
  	    a_Position, 	        // choose Vertex Shader attribute to fill with data
  		4, 				        // how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		        // data type for each value: usually gl.FLOAT
  		false, 				    // did we supply fixed-point data AND it needs normalizing?
  		FSIZE * floatsPerVertex, // Stride -- how many bytes used to store each vertex? [(x,y,z,w, r,g,b) * bytes/value]
  		0);						// Offset -- now many bytes from START of buffer to the value we will actually use?

    // Enable assignment of vertex buffer object's position data
    gl.enableVertexAttribArray(a_Position);  
  									
    // Get graphics system's handle for our Vertex Shader's color-input variable;
    var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if(a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
    return -1;
    }
    // Use handle to specify how to retrieve **COLOR** data from our VBO:
    gl.vertexAttribPointer(
  	    a_Color, 		// choose Vertex Shader attribute to fill with data
  	    3, 				// how many values? 1,2,3 or 4. (we're using R,G,B)
  	    gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  	    false, 			// did we supply fixed-point data AND it needs normalizing?
  	    FSIZE * 7, 		// Stride -- how many bytes used to store each vertex? [(x,y,z,w, r,g,b) * bytes/value]
  	    FSIZE * 4);		// Offset -- how many bytes from START of buffer to the value we will actually use?  Need to skip over x,y,z,w
  	
    // Enable assignment of vertex buffer object's position data
    gl.enableVertexAttribArray(a_Color);  

    // Unbind the buffer object 
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return verts;
}

function makeCube() {
//==============================================================================
// Make a cube from one OpenGL TRIANGLE primitive.
// Create a cube
//    v6----- v5
//   /|      /|
//  v1------v0|
//  | |     | |
//  | |v7---|-|v4
//  |/      |/
//  v2------v3
    
    // Create a (global) array to hold this cube's vertices:
    cubeVerts = new Float32Array([
        // Vertex coordinates and color
          1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,  // v0 White
         -1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0,  // v1 Magenta
         -1.0, -1.0, 1.0, 1.0, 1.0, 0.0, 0.0,  // v2 Red
          1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 0.0,  // v3 Yellow
          1.0, -1.0, -1.0, 1.0, 0.0, 1.0, 0.0,  // v4 Green
          1.0, 1.0, -1.0, 1.0, 0.0, 1.0, 1.0,  // v5 Cyan
         -1.0, 1.0, -1.0, 1.0, 0.0, 0.0, 1.0,  // v6 Blue
         -1.0, -1.0, -1.0, 1.0, 0.0, 0.0, 0.0   // v7 Black
        ]);

    
}

function makeSphere() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
											// (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts	= 27;	// # of vertices around the top edge of the slice
											// (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([0.7, 0.7, 0.7]);	// North Pole: light gray
  var equColr = new Float32Array([0.3, 0.7, 0.3]);	// Equator:    bright green
  var botColr = new Float32Array([0.9, 0.9, 0.9]);	// South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

	// Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 
										// each slice requires 2*sliceVerts vertices except 1st and
										// last ones, which require only 2*sliceVerts-1.
										
	// Create dome-shaped top slice of sphere at z=+1
	// s counts slices; v counts vertices; 
	// j counts array elements (vertices * elements per vertex)
	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
	var sin0 = 0.0;
	var cos1 = 0.0;
	var sin1 = 0.0;	
	var j = 0;							// initialize our array index
	var isLast = 0;
	var isFirst = 1;
	for(s=0; s<slices; s++) {	// for each slice of the sphere,
		// find sines & cosines for top and bottom of this slice
		if(s==0) {
			isFirst = 1;	// skip 1st vertex of 1st slice.
			cos0 = 1.0; 	// initialize: start at north pole.
			sin0 = 0.0;
		}
		else {					// otherwise, new top edge == old bottom edge
			isFirst = 0;	
			cos0 = cos1;
			sin0 = sin1;
		}								// & compute sine,cosine for new bottom edge.
		cos1 = Math.cos((s+1)*sliceAngle);
		sin1 = Math.sin((s+1)*sliceAngle);
		// go around the entire slice, generating TRIANGLE_STRIP verts
		// (Note we don't initialize j; grows with each new attrib,vertex, and slice)
		if(s==slices-1) isLast=1;	// skip last vertex of last slice.
		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {	
			if(v%2==0)
			{				// put even# vertices at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI(v/2*sliceVerts))  
				sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
				sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
				sphVerts[j+2] = cos0;		
				sphVerts[j+3] = 1.0;			
			}
			else { 	// put odd# vertices around the slice's lower edge;
							// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
							// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
				sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
				sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
				sphVerts[j+2] = cos1;											// z
				sphVerts[j+3] = 1.0;											// w.		
			}
			if(s==0) {	// finally, set some interesting colors for vertices:
				sphVerts[j+4]=topColr[0]; 
				sphVerts[j+5]=topColr[1]; 
				sphVerts[j+6]=topColr[2];	
				}
			else if(s==slices-1) {
				sphVerts[j+4]=botColr[0]; 
				sphVerts[j+5]=botColr[1]; 
				sphVerts[j+6]=botColr[2];	
			}
			else {
					sphVerts[j+4]=Math.random();// equColr[0]; 
					sphVerts[j+5]=Math.random();// equColr[1]; 
					sphVerts[j+6]=Math.random();// equColr[2];					
			}
		}
	}
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

	var xcount = 100;			// # of lines to draw in x,y to make the grid.
	var ycount = 100;		
	var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
 	var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
 	var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
 	
	// Create a (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.
						
	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	
	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu
	}
	// Second, step thru y values as we make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
	}
}

function makeDrawingAxes() {
// Drawing Axes: Draw them using gl.LINES drawing primitive;
    // +x axis RED; +y axis GREEN; +z axis BLUE; origin: GRAY
    drawingAxes = new Float32Array([
    0.0, 0.0, 0.0, 1.0, 0.3, 0.3, 0.3,	// X axis line (origin: gray)
    1.3, 0.0, 0.0, 1.0, 1.0, 0.3, 0.3,	//(endpoint: red)

    0.0, 0.0, 0.0, 1.0, 0.3, 0.3, 0.3,	// Y axis line (origin: white)
    0.0, 1.3, 0.0, 1.0, 0.3, 1.0, 0.3,	//(endpoint: green)

    0.0, 0.0, 0.0, 1.0, 0.3, 0.3, 0.3,	// Z axis line (origin:white)
    0.0, 0.0, 1.3, 1.0, 0.3, 0.3, 1.0,	//(endpoint: blue)
    ]);
}

function draw(gl, n, currentAngle, u_ViewMatrix, viewMatrix) {
//==============================================================================
    // Clear <canvas>  colors AND the depth buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Using OpenGL/ WebGL 'viewports':
    // these determine the mapping of CVV to the 'drawing context',
    // (for WebGL, the 'gl' context describes how we draw inside an HTML-5 canvas)
    // Details? see
    //
    //  https://www.khronos.org/registry/webgl/specs/1.0/#2.3

/*
    //-------Draw Spinning Cube:
    viewMatrix.setTranslate(-2, 1, 0.0);  // 'set' means DISCARD old matrix,
  						                       // (drawing axes centered in CVV), and then make new
  						                       // drawing axes moved to the lower-left corner of CVV. 
    viewMatrix.scale(.01,.01,-.01);			   // convert to left-handed coord sys to match WebGL display canvas.
    viewMatrix.scale(.05, .05, .05);           // if you DON'T scale, cube goes outside the CVV; clipped!
    viewMatrix.rotate(currentAngle, 1, 0, 0);  // spin around y axis.

    // Drawing:
    // Pass our current matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    // Draw just the the cube's vertices:
    gl.drawArrays(gl.TRIANGLES,				            // use this drawing primitive, and
  							cubeStart/floatsPerVertex,   // start at this vertex number, and
  							cubeVerts.length/floatsPerVertex);	// draw this many vertices.

*/
    //--------Draw Spinning Sphere:
    viewMatrix.setTranslate( 0.4, 0.4, 0.0);    // 'set' means DISCARD old matrix,
  						                        // (drawing axes centered in CVV), and then make new
  						                        // drawing axes moved to the lower-left corner of CVV.
    viewMatrix.scale(1,1,-1);					// convert to left-handed coord sys to match WebGL display canvas.
    viewMatrix.scale(0.1, 0.1, 0.1); 			// Make it smaller:
    viewMatrix.rotate(currentAngle, 1, 1, 0);   // Spin on XY diagonal axis

    // Drawing:		
	// Pass our current matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  		// Draw just the sphere's vertices
    gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  				  sphStart/floatsPerVertex,	        // start at this vertex number, and 
  				  sphVerts.length/floatsPerVertex);	// draw this many vertices.
  

    // FIRST VIEWPORT: Fixed orthographic view of front
    //---------------------------------------------------------------------------
    //---------Draw Ground Plane, without spinning
    // Set the matrix to be used for to set the camera view
    viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, 0, 0, -1, 0, 1, 0);

    // Pass the view projection matrix to our shaders:
   // gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

    gl.viewport(0, 				                    // Viewport upper-left corner
                gl.drawingBufferHeight / 2, 		// location(in pixels)
                gl.drawingBufferWidth / 2, 			// viewport width, height.
                gl.drawingBufferHeight / 2);

    // Draw just the ground-plane's vertices
    gl.drawArrays(gl.LINES, 								// use this drawing primitive, and
                  gndStart / floatsPerVertex,	            // start at this vertex number, and
                  gndVerts.length / floatsPerVertex);	    // draw this many vertices.

    // SECOND VIEWPORT: Fixed orthographic view of top
    //-----------------------------------------------------------------------------
    //---------Draw Ground Plane, without spinning
    // Set the matrix to be used for to set the camera view
    viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, 0, 0, -1, 0, 1, 0);

    // Pass the view projection matrix
    //gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

    gl.viewport(0,  							// Viewport lower-left corner
				0,								// (x,y) location(in pixels)
  				gl.drawingBufferWidth / 2, 		// viewport width, height.
  				gl.drawingBufferHeight / 2);

    // Draw just the ground-plane's vertices
    gl.drawArrays(gl.LINES, 						            // use this drawing primitive, and
  				  gndStart/floatsPerVertex,	                    // start at this vertex number, and
  				  gndVerts.length / floatsPerVertex);	        // draw this many vertices

    // THIRD VIEWPORT: Fixed orthographic view of side
    //------------------------------------------
    //---------Draw Ground Plane, without spinning
    // Set the matrix to be used for to set the camera view
    viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, 0, 0, -1, 0, 1, 0);

    // Pass the view projection matrix to our shaders:
    //gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    
    gl.viewport(gl.drawingBufferWidth / 2, 		// Viewport lower-left corner
                gl.drawingBufferHeight / 2,     // location(in pixels)
                gl.drawingBufferWidth / 2, 		// viewport width, height.
                gl.drawingBufferHeight / 2);

    // Draw just the ground-plane's vertices
     gl.drawArrays(gl.LINES, 								    // use this drawing primitive, and
  				   gndStart / floatsPerVertex,	                // start at this vertex number, and
  				   gndVerts.length / floatsPerVertex);	        // draw this many vertices.

    // FOURTH VIEWPORT: 3D perspective view
    //------------------------------------------
    //---------Draw Ground Plane, without spinning
    // Set the matrix to be used for to set the camera view
    viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, 0, 0, -1, 0, 1, 0);
    //viewMatrix.setOrtho(-1.0, 1.0, -1.0, 1.0, 0.0, 2.0);
 

    // Pass the view projection matrix to our shaders:
    //gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

    // DON'T clear <canvas> or you'll WIPE OUT what you drew in 1st viewport
    // gl.clear(gl.COLOR_BUFFER_BIT);

    gl.viewport(gl.drawingBufferWidth / 2, 		// Viewport lower-left corner
                0, 								// location(in pixels)
                gl.drawingBufferWidth / 2, 		// viewport width, height.
                gl.drawingBufferHeight / 2);

    // Draw just the ground-plane's vertices
    gl.drawArrays(gl.LINES, 								     // use this drawing primitive, and
  				gndStart / floatsPerVertex,	                 // start at this vertex number, and
  				gndVerts.length / floatsPerVertex);	         // draw this many vertices.

	
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

function animate(angle) {
//==============================================================================
    // Calculate the elapsed time
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;
  
    // Update the current rotation angle (adjusted by the elapsed time)
    //  limit the angle to move smoothly between +20 and -85 degrees:
    //  if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
    //  if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
    var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle %= 360;
}

//==================HTML Button Callbacks
function nextShape() {
	shapeNum += 1;
	if(shapeNum >= shapeMax) shapeNum = 0;
}

function spinDown() {
 ANGLE_STEP -= 25; 
}

function spinUp() {
  ANGLE_STEP += 25; 
}

function runStop() {
  if(ANGLE_STEP*ANGLE_STEP > 1) {
    myTmp = ANGLE_STEP;
    ANGLE_STEP = 0;
  }
  else {
  	ANGLE_STEP = myTmp;
  }
}
 