#version 300 es
precision highp float; // ?
uniform highp usampler2D tex; // ?

uniform bool density;
uniform bool toe;

uniform float m;
uniform float b;
uniform float d;
uniform vec3 dmin;

in vec2 pixelCoordinate; // receive pixel position from vertex shader
out vec4 outColor;

float x1 = -4.921148056598055f;
float me = 0.608682015834621f;
float qe = 0.04002475383287418f;
float ae = -0.013676963037982022f;
float be = 0.47406929568556366f;
float ce = 0.5058620370593871f;

float ets_curve(float x) {
  if(x < x1) {
    return me * x + qe;
  } else {
    return ae * x * x + be * x + ce;
  }
}

vec3 exp_to_sRGB(vec3 color) {
  // Log2 to Log2
  return vec3(ets_curve(color[0]), ets_curve(color[1]), ets_curve(color[2]));
}

float pte_curve(float x, float m, float b, float d, float x1) {
  float x0 = x1 + d;
  if(x >= x0) {
    return m * x + b;
  } else if(x > x1) {
    return m * (2.0f * x0 - x1 - (x0 - x1) * (x0 - x1) / (x - x1)) + b;
  } else {
    return -1000.0f;
  }
}

vec3 paper_to_exp(vec3 color) {
  // Log10 to Log2
  return vec3(pte_curve(color[0], m, b, d, dmin[0]), pte_curve(color[1], m, b, d, dmin[1]), pte_curve(color[2], m, b, d, dmin[2]));
}

void main() {
  uvec3 unsignedIntValues = texture(tex, pixelCoordinate).rgb;
  vec3 floatValues0To65535 = vec3(unsignedIntValues);
  vec3 color = floatValues0To65535 / vec3(16384.0f);

  if(density) {
    color = -log(color) / log(vec3(10.0f)); // Density
    if(toe) {
      color = paper_to_exp(color); // Paper
    } else {
      color = vec3(m) * color + vec3(b); // Linear
    }
    color = pow(vec3(2), exp_to_sRGB(color)); //sRGB
  } else {
    color = color;
  }
  outColor = vec4(color[0], color[1], color[2], 1.0f);
}
