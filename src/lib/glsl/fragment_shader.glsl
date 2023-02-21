#version 300 es
precision highp float; // ?
uniform highp usampler2D tex; // ?

uniform mat4 matrix1;
uniform mat4 matrix2;

uniform bool inv;
uniform bool trichrome;
uniform vec4 fac;
uniform vec4 exponent;
uniform vec4 wb;

vec4 invert(vec4 color, vec4 fac, vec4 exponent) {
  return pow(color * fac, -exponent);
}

vec4 applyMatrix(vec4 color, mat4 matrix) {
  return matrix * color;
}

vec4 correctGamma(vec4 color) {
  float gamma = 0.41666666;
  return (pow(color, vec4(gamma, gamma, gamma, 1)) * 1.055) - 0.055;
}

vec4 whitebalance(vec4 color, vec4 wb) {
  return color * wb;
}

vec4 toneCurve(vec4 color) {
  vec4 a = vec4(-1.63, -1.63, -1.63, -1.63);
  vec4 b = vec4(1.85, 1.85, 1.85, 1.85);
  vec4 c = vec4(0.78, 0.78, 0.78, 0.78);
  return a * pow(color, vec4(3, 3, 3, 3)) + b * pow(color, vec4(2, 2, 2, 2)) + c * color;
}

in vec2 pixelCoordinate; // receive pixel position from vertex shader
out vec4 outColor;
void main() {
  uvec4 unsignedIntValues = texture(tex, pixelCoordinate);
  vec4 floatValues0To65535 = vec4(unsignedIntValues);
  vec4 color = floatValues0To65535 / vec4(16384.0, 16384.0, 16384.0, 65535.0);
  if(trichrome) {
    color = exp(applyMatrix(log(color), matrix1));
  } else {
    color = applyMatrix(color, matrix1);
  }
  if(inv) {
    color = invert(color, fac, exponent);
  }
    //color = whitebalance(color, wb);
  color = applyMatrix(color, matrix2);
  color = correctGamma(color);
  color = clamp(color, vec4(0.0, 0.0, 0.0, 0.0), vec4(1.0, 1.0, 1.0, 1.0));
  color = toneCurve(color);
  outColor = color;
}
