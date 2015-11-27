precision mediump float;

attribute vec3 point;
attribute float index;

uniform float scale;
uniform float start;
uniform float len;

varying vec2 coord;
varying float fade;

void main() {
    coord = point.xy * scale;    
    gl_Position = vec4(coord, 0.0, 1.0);
    float position = mod((index - start), len);
    if (position < 1.5 || position > len - 1.5)
        position = 0.0; // trim loop connection
    fade = pow(position / len, 1.2);
}
