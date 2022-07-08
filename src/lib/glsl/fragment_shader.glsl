#version 300 es
precision highp float; // ?
uniform highp usampler2D tex; // ?

uniform float black;
uniform mat4 matrix;

uniform bool inv;
uniform vec4  fac;
uniform vec4 exponent;


uvec4 invert(uvec4 color, vec4 fac, vec4 exponent, float black) {
  return fac*exp(1/(color - vec4(black, black, black, 0)), exponent);
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
    if (inv) {
      unsignedIntValues = invert(unsignedIntValues, fac, exponent, black);
    }
    vec4 floatValues0To65535 = vec4(unsignedIntValues);
    vec4 color = floatValues0To65535 / vec4(16384.0, 16384.0, 16384.0, 65535.0);
    //color = subtractBlack(color, black);
    color = applyMatrix(color, matrix);
    outColor = correctGamma(color);
}
