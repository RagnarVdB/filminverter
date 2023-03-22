#version 300 es
precision highp float; // ?
uniform highp usampler2D tex; // ?

uniform mat3 matrix1;
uniform mat3 matrix2;

uniform bool trichrome;
uniform vec3 fac;
uniform vec3 exponent;

vec3 invert(vec3 color, vec3 fac, vec3 exponent) {
  return pow(color * fac, -exponent);
}

vec3 applyMatrix(vec3 color, mat3 matrix) {
  return matrix * color;
}

vec3 correctGamma(vec3 color) {
  float gamma = 0.41666666;
  return (pow(color, vec3(gamma, gamma, gamma)) * 1.055) - 0.055;
}

in vec2 pixelCoordinate; // receive pixel position from vertex shader
out vec4 outColor;
void main() {
  uvec3 unsignedIntValues = texture(tex, pixelCoordinate).rgb;
  vec3 floatValues0To65535 = vec3(unsignedIntValues);
  vec3 color = floatValues0To65535 / vec3(16384.0, 16384.0, 16384.0);
  if(trichrome) {
    color = exp(applyMatrix(log(color), matrix1));
  } else {
    color = applyMatrix(color, matrix1);
  }
  color = invert(color, fac, exponent);
    //color = whitebalance(color, wb);
  color = applyMatrix(color, matrix2);
  color = correctGamma(color);
  color = clamp(color, vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0));
  outColor = vec4(color[0], color[1], color[2], 1.0);
}
