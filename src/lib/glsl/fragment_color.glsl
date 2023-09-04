#version 300 es
precision highp float; // ?
uniform highp usampler2D tex; // ?

uniform mat3 matrix1; // CAM_to_APD
uniform mat3 matrix2; // Cam_to_sRGB

uniform mat3 matrix3; // sRGB_to_Cam

// uniform bool trichrome;
uniform bool toe;
// uniform vec3 fac;
// uniform vec3 dmin;
// uniform vec3 exponent;

in vec2 pixelCoordinate; // receive pixel position from vertex shader
out vec4 outColor;

vec3 correctGamma(vec3 color) {
  float gamma = 0.41666666f;
  return (pow(color, vec3(gamma, gamma, gamma)) * 1.055f) - 0.055f;
}

// float LUT1D(float x) {
//   // CID -> ACES tone curve 
//   if(x < 0.0f) {
//     return 16.4f * x - 2.9f;
//   } else if(x < 0.3f) {
//     return -584.6413f * x * x * x * x + 447.43127f * x * x * x - 120.411f * x * x + 16.4f * x - 2.9f;
//   } else {
//     return 1.818181f * x - 2.0174547676239f;
//   }
// }

// vec3 apply_toe(vec3 color) {
//   return exponent * vec3(LUT1D(color[0]), LUT1D(color[1]), LUT1D(color[2])) + fac;
// }

// vec3 apply_linear(vec3 color) {
//   return exponent * (1.818181f * color - 2.0174547676239f) + fac;
// }

// vec3 to_cid(vec3 color) {
//   return matrix2 * (log(dmin) - log(matrix1 * color)) / 2.302585092994046f;
// }

float m = 0.96833651793f;
float b1 = 1.47773013576f;
float x1 = -4.51966835185f;
float x2 = 1.46756795411f;
float a = -0.0808667362074f;
float b = 0.237354861223f;
float c = -0.174167194041f;

float ets_curve(float x) {
  if(x < x1) {
    return b1 + m * x;
  } else if(x < x2) {
    return a * x * x + b * x + c;
  } else {
    return 0.0f;
  }
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
    return m * (2.0f * x0 - x1 - (x0 - x1) * (x0 - x1) / (x - x1)) + b;
  } else {
    return -1000.0f;
  }
}

vec3 paper_to_exp(vec3 color) {
  // Log10 to Log2
  return vec3(
    pte_curve(color[0], 10.531269923574797f, -7.6235230730095038f, 0.1f, 0.23031522712591435f),
    pte_curve(color[1], 5.5893286963405719f, -9.8423546905078698f, 0.2f, 0.74694390911064334f),
    pte_curve(color[2], 7.7636770103438666f, -12.886045218300108f, 0.2f, 0.88572369488605363f)
  );
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

  if(toe) {
    // Raw to sRGB
    // f(A log10(c))
    color = matrix1 * (log(color) / log(vec3(10.0f))); // APD
    color = paper_to_exp(color); // Paper

    // exp2(g(x))
    color = pow(vec3(2), exp_to_sRGB(color)); //sRGB
  } else {
    // Processed to sRGB
    // f(A log10(c))
    // color = matrix1 * (log(color) / log(vec3(10.0f)));
    // color = paper_to_exp(color);

    // color =  0.28235617170f * pow(vec3(2), color);
    // color = matrix3 * color;

    vec3 mult = vec3(0.9122516556291391f, 1, 0.9188741721854304f);
    color = matrix2 * (color * mult);
    color = pow(vec3(2), exp_to_sRGB(log2(color)));
    // color = color;
  }
  outColor = vec4(color[0], color[1], color[2], 1.0f);
}
