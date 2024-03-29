#version 300 es
in vec4 vertex; // incoming pixel input?
out vec2 pixelCoordinate; // variable used to pass position to fragment shader

uniform mat2 rot;
uniform vec2 trans;
uniform vec2 scale;
void main() {
    gl_Position = vertex;  // set pixel output position to incoming position (pass through)
    // pixelCoordinate = vec2(vertex.y, vertex.x)*vec2(0.5, 0.5)+vec2(0.5, 0.5); // set coordinate for fragment shader
    //pixelCoordinate = vec2(vertex.x, vertex.y) * rotX + vec2(vertex.y, vertex.x) * rotY + trans; // set coordinate for fragment shader
    pixelCoordinate = scale * (rot * vec2(vertex.x, vertex.y) + vec2(1.0, 1.0)) + trans; // set coordinate for fragment shader
}
