#version 300 es
precision highp float; // ?
uniform highp usampler2D tex; // ?

in vec2 pixelCoordinate; // receive pixel position from vertex shader
out vec4 outColor;

vec3 correctGamma(vec3 color) {
  float gamma = 0.41666666f;
  return (pow(color, vec3(gamma, gamma, gamma)) * 1.055f) - 0.055f;
}

vec3 exp_to_sRGB(vec3 color) {
  // Log2 to Log2
  return vec3(ets_curve(color[0]), ets_curve(color[1]), ets_curve(color[2]));
}

float pte_curve(float x, float m, float b, float d, float x1) {
  float x0 = x1 - d;
  if(x >= x0) {
    return m * x + b;
  } else if(x >= x1) {
    return m * (2 * x0 - x1 - (x0 - x1) * (x0 - x1) / (x - x1)) + b;
  } else {
    return -1000.0f;
  }
}

vec3 paper_to_exp(vec3 color) {
  // Log10 to Log2
  return vec3(pte_curve(color[0], 10.531269923574797f, -7.6235230730095038f, 0.1f, 0.23031522712591435f), pte_curve(color[1], 5.5893286963405719f, -9.8423546905078698f, 0.2f, 0.74694390911064334f), pte_curve(color[2], 7.7636770103438666f, -12.886045218300108f, 0.2f, 0.88572369488605363f));
}

void main() {
  uvec3 unsignedIntValues = texture(tex, pixelCoordinate).rgb;
  vec3 floatValues0To65535 = vec3(unsignedIntValues);
  vec3 color = floatValues0To65535 / vec3(16384.0f);

  // if(toe) {
  //   color = exp(2.302585092994046f * apply_toe(to_cid(color)));
  // } else {
  //   color = exp(2.302585092994046f * apply_linear(to_cid(color)));
  //   // color = exp()
  // }
  // color = correctGamma(matrix3 * color);
  // color = clamp(color, vec3(0.0f, 0.0f, 0.0f), vec3(1.0f, 1.0f, 1.0f));

    // Raw to sRGB
    // f(A log10(c))
  color = matrix1 * (log(color) / log(vec3(10.0f))); // APD
  color = paper_to_exp(color); // Paper

    // exp2(g(x))
  color = pow(vec3(2), exp_to_sRGB(color)); //sRGB

  outColor = vec4(color[0], color[1], color[2], 1.0f);
}
