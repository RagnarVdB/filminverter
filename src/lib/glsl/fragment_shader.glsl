#version 300 es
precision highp float; // ?
uniform highp usampler2D tex; // ?

uniform mat3 matrix1;
uniform mat3 matrix2;
uniform mat3 matrix3;

// uniform bool trichrome;
uniform bool toe;
uniform vec3 fac;
uniform vec3 dmin;
uniform vec3 exponent;

in vec2 pixelCoordinate; // receive pixel position from vertex shader
out vec4 outColor;

vec3 correctGamma(vec3 color) {
  float gamma = 0.41666666;
  return (pow(color, vec3(gamma, gamma, gamma)) * 1.055) - 0.055;
}

float LUT1D(float x) {
  if(x < 0.0) {
    return 16.4 * x - 2.9;
  } else if(x < 0.3) {
    return -584.6413 * x * x * x * x + 447.43127 * x * x * x - 120.411 * x * x + 16.4 * x - 2.9;
  } else {
    return 1.818181 * x - 2.0174547676239;
  }
}

vec3 apply_toe(vec3 color) {
  return exponent * vec3(LUT1D(color[0]), LUT1D(color[1]), LUT1D(color[2])) + fac;
}

vec3 apply_linear(vec3 color) {
  return exponent * (1.818181 * color - 2.0174547676239) + fac;
}

vec3 to_cid(vec3 color) {
  return matrix2 * (log(dmin) - log(matrix1 * color)) / 2.302585092994046;
}

void main() {
  uvec3 unsignedIntValues = texture(tex, pixelCoordinate).rgb;
  vec3 floatValues0To65535 = vec3(unsignedIntValues);
  vec3 color = floatValues0To65535 / vec3(16384.0, 16384.0, 16384.0);
  if(toe) {
    color = exp(2.302585092994046 * apply_toe(to_cid(color)));
  } else {
    color = exp(2.302585092994046 * apply_linear(to_cid(color)));
    // color = exp()
  }
  color = correctGamma(matrix3 * color);
  color = clamp(color, vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0));
  outColor = vec4(color[0], color[1], color[2], 1.0);
}
