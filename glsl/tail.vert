attribute vec3 point;
attribute float index;

uniform float aspect;
uniform float scale;
uniform vec3 rotation;
uniform vec3 translation;
uniform float tail_length;
uniform float max_length;
uniform float start;
uniform float rho;

varying float fade;

void main() {
    vec4 position = vec4(point.xy, point.z - rho, 1);
    gl_Position = view_frustum(radians(45.0), aspect, 0.0, 10.0)
        * translate(translation.x, translation.y, translation.z)
        * rotate_x(rotation.x)
        * rotate_y(rotation.y)
        * rotate_z(rotation.z)
        * view_scale(scale, scale, scale)
        * position;

    float line_position = mod(start - index, max_length);
    if (line_position < 1.5 || line_position > tail_length - 1.5)
        fade = 0.0; // trim loop connection
    else
        fade = 1.0 - pow(line_position / tail_length, 1.2);
}
