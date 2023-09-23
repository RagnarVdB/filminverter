#version 300 es
precision highp float; // ?
uniform highp usampler2D tex; // ?

uniform bool toe;
uniform bool show_clipping;
uniform bool show_negative;

uniform float tone_curve[256];
uniform float tc_exp_shift;

uniform vec3 clip_values;

uniform float m;
uniform vec3 b;
uniform float d;
uniform vec3 dmin;

in vec2 pixelCoordinate; // receive pixel position from vertex shader
out vec4 outColor;

float applyLUT(float x) {
  return tone_curve[int(x * 255.0f)];
}

float sRGB_gamma(float x) {
  if(x <= 0.0031308f) {
    return 12.92f * x;
  } else {
    return 1.055f * pow(x, 1.0f / 2.4f) - 0.055f;
  }
}

vec3 exp_to_sRGB(vec3 color) {
  return vec3(sRGB_gamma(applyLUT(color[0])), sRGB_gamma(applyLUT(color[1])), sRGB_gamma(applyLUT(color[2])));
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
  return vec3(pte_curve(color[0], m, b[0], d, dmin[0]), pte_curve(color[1], m, b[1], d, dmin[1]), pte_curve(color[2], m, b[2], d, dmin[2]));
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
    color = -log(color) / log(vec3(10.0f)); // Density
    if(toe) {
      color = paper_to_exp(color); // Paper
    } else {
      color = vec3(m) * color + vec3(b); // Linear
    }
    if(show_clipping) {
      color = clip_red(color);
    } else {
      color = clip_white(color);
    }
    color = color - vec3(tc_exp_shift);
    color = exp_to_sRGB(pow(vec3(2), color)); //sRGB
  } else {
    color = log(color) / log(vec3(2.0f));
    color = color - vec3(tc_exp_shift);
    color = exp_to_sRGB(pow(vec3(2), color)); //sRGB
  }
  outColor = vec4(color[0], color[1], color[2], 1.0f);
}
