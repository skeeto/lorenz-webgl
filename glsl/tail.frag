precision mediump float;

uniform vec3 color;
varying float fade;

void main() {
    gl_FragColor = vec4(color, fade);
}
