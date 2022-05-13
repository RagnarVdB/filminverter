precision highp float;

varying vec2 texCoords;
uniform sampler2D textureSampler;
uniform float exposure;
uniform float black;
uniform mat3 matrix;

vec3 expose(vec3 color, float exposure) {
  return color*pow(2.0, exposure);
}

vec3 applyMatrix(vec3 color, mat3 matrix) {
  return matrix * color;
}

vec3 subtractBlack(vec3 color, float black) {
  return color - black;
}

vec3 correctGamma(vec3 color) {
  float gamma = 0.41666666;
    return pow(color*1.055, vec3(gamma, gamma, gamma)) - 0.055;
}

void main() {
  vec4 color = texture2D(textureSampler, texCoords);
  color.rgb = subtractBlack(color.rgb, black);
  color.rgb = applyMatrix(color.rgb, matrix);
  color.rgb = expose(color.rgb, exposure);
  color.rgb = correctGamma(color.rgb);
  gl_FragColor = color;
}