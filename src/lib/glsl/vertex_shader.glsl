#version 300 es
in vec4 vertex; // incoming pixel input?
out vec2 pixelCoordinate; // variable used to pass position to fragment shader
void main(){
    gl_Position = vertex;  // set pixel output position to incoming position (pass through)
    pixelCoordinate = vertex.xy*0.5+0.5; // set coordinate for fragment shader
}
