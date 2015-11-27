precision mediump float;

attribute vec3 point;
varying vec2 coord;

void main() {
    coord = point.xy / 25.0;    
    gl_Position = vec4(coord, 0.0, 1.0);
    gl_PointSize = 8.0;
}
