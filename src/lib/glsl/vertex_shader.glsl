#version 300 es
in vec4 vertex; // incoming pixel input?
out vec2 pixelCoordinate; // variable used to pass position to fragment shader

uniform vec2 rotX;
uniform vec2 rotY;
uniform vec2 trans;
void main(){
    gl_Position = vertex;  // set pixel output position to incoming position (pass through)
    // pixelCoordinate = vec2(vertex.y, vertex.x)*vec2(0.5, 0.5)+vec2(0.5, 0.5); // set coordinate for fragment shader
    pixelCoordinate = vec2(vertex.x, vertex.y)*rotX + vec2(vertex.y, vertex.x)*rotY + trans; // set coordinate for fragment shader
}
