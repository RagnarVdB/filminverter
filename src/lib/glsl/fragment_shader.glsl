#version 300 es
precision highp float; // ?
uniform highp usampler2D tex; // ?

uniform float exposure;
uniform float black;
uniform mat4 matrix;

vec4 expose(vec4 color, float exposure) {
    float e = pow(2.0, exposure);
    return color * vec4(e, e, e, 1);
}

vec4 applyMatrix(vec4 color, mat4 matrix) {
  return matrix * color;
}

vec4 subtractBlack(vec4 color, float black) {
  return color - vec4(black, black, black, 0);
}

vec4 correctGamma(vec4 color) {
  float gamma = 0.41666666;
    return (pow(color, vec4(gamma, gamma, gamma, 1))*1.055) - 0.055;
}

in vec2 pixelCoordinate; // receive pixel position from vertex shader
out vec4 outColor;
void main() {
    uvec4 unsignedIntValues = texture(tex, pixelCoordinate);
    vec4 floatValues0To65535 = vec4(unsignedIntValues);
    vec4 color = floatValues0To65535 / vec4(16384.0, 16384.0, 16384.0, 65535.0);
    color = subtractBlack(color, black);
    color = expose(color, exposure);
    color = applyMatrix(color, matrix);
    outColor = correctGamma(color);
}
