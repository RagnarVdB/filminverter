#version 300 es
precision highp float; // ?
uniform highp usampler2D tex; // ?

uniform bool toe;
uniform bool show_clipping;
uniform bool show_negative;

uniform int tc_index;
uniform float tc_exp_shift;

uniform mat3 cam_to_apd;
uniform mat3 cam_to_sRGB;
// uniform mat3 cdd_to_cid;
// uniform mat3 exp_to_sRGBMatrix;

uniform vec3 clip_values;

uniform vec3 m;
uniform vec3 b;
uniform vec3 d;
uniform vec3 dmin;

in vec2 pixelCoordinate; // receive pixel position from vertex shader
out vec4 outColor;

float x1 = -5.54519159776f;
float me = 0.966354066548f;
float qe = 2.59594911446f;
float ae = -0.0844234434652f;
float be = 0.0300657278329f;
float ce = 0.0f;

float ets_curve(float x) {
  if(x < x1) {
    return me * x + qe;
  } else {
    return ae * x * x + be * x + ce;
  }
}

vec3 exp_to_sRGB(vec3 color) {
  // Log2 to Log2
  if(tc_index == 0) {
    return vec3(ets_curve(color[0]), ets_curve(color[1]), ets_curve(color[2]));
  } else {
    return vec3(-3.0f);
  }
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
  return vec3(pte_curve(color[0], m[0], b[0], d[0], dmin[0]), pte_curve(color[1], m[1], b[1], d[1], dmin[1]), pte_curve(color[2], m[2], b[2], d[2], dmin[2]));
}

vec3 clip_red(vec3 color) {
  if(color[0] > clip_values[0] || color[1] > clip_values[1] || color[2] > clip_values[2]) {
    return vec3(0.0f, -10.0f, -10.0f);
  } else {
    return color;
  }
}

vec3 clip_white(vec3 color) {
  if(color[0] > clip_values[0] || color[1] > clip_values[1] || color[2] > clip_values[2]) {
    return vec3(0.0f);
  } else {
    return color;
  }
}

void main() {
  uvec3 unsignedIntValues = texture(tex, pixelCoordinate).rgb;
  vec3 floatValues0To65535 = vec3(unsignedIntValues);
  vec3 color = floatValues0To65535 / vec3(16384.0f);

  if(!show_negative) {
    color = -cam_to_apd * log(color) / log(vec3(10.0f)); // Density
    // color = cdd_to_cid * color;
    if(toe) {
      color = paper_to_exp(color); // Paper
    } else {
      color = vec3(m) * color + vec3(b); // Linear
    }
    color = color - vec3(tc_exp_shift);
    if(show_clipping) {
      color = clip_red(color);
    } else {
      color = clip_white(color);
    }
    color = pow(vec3(2), exp_to_sRGB(color)); //sRGB
    // color = exp_to_sRGBMatrix * color;
  } else {
    // color = cdd_to_cid * color;
    // color = exp_to_sRGBMatrix * color;
    color = cam_to_sRGB * color;
    color = log(color) / log(vec3(2.0f));
    if(show_clipping) {
      color = clip_red(color);
    } else {
      color = clip_white(color);
    }
    color = pow(vec3(2), exp_to_sRGB(color)); //sRGB
  }
  outColor = vec4(color[0], color[1], color[2], 1.0f);
}
