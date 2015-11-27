precision mediump float;

attribute vec3 point;

uniform float scale;

void main() {
    gl_Position = vec4(point.xy * scale, 0.0, 1.0);
    gl_PointSize = 8.0;
}
