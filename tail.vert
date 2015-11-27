precision mediump float;

attribute vec3 point;
attribute float index;

uniform float aspect;
uniform float scale;
uniform vec3 rotation;
uniform vec3 translation;
uniform float start;
uniform float len;

varying float fade;

mat4 view_frustum(
    float angle_of_view,
    float aspect_ratio,
    float z_near,
    float z_far
) {
    return mat4(
        vec4(1.0/tan(angle_of_view),           0.0, 0.0, 0.0),
        vec4(0.0, aspect_ratio/tan(angle_of_view),  0.0, 0.0),
        vec4(0.0, 0.0,    (z_far+z_near)/(z_far-z_near), 1.0),
        vec4(0.0, 0.0, -2.0*z_far*z_near/(z_far-z_near), 0.0)
    );
}

mat4 view_scale(float x, float y, float z)
{
    return mat4(
        vec4(x,   0.0, 0.0, 0.0),
        vec4(0.0, y,   0.0, 0.0),
        vec4(0.0, 0.0, z,   0.0),
        vec4(0.0, 0.0, 0.0, 1.0)
    );
}

mat4 translate(float x, float y, float z)
{
    return mat4(
        vec4(1.0, 0.0, 0.0, 0.0),
        vec4(0.0, 1.0, 0.0, 0.0),
        vec4(0.0, 0.0, 1.0, 0.0),
        vec4(x,   y,   z,   1.0)
    );
}

mat4 rotate_x(float t)
{
    float st = sin(t);
    float ct = cos(t);
    return mat4(
        vec4(1.0, 0.0, 0.0, 0.0),
        vec4(0.0,  ct,  st, 0.0),
        vec4(0.0, -st,  ct, 0.0),
        vec4(0.0, 0.0, 0.0, 1.0)
    );
}


mat4 rotate_y(float t)
{
    float st = sin(t);
    float ct = cos(t);
    return mat4(
        vec4( ct, 0.0,  st, 0.0),
        vec4(0.0, 1.0, 0.0, 0.0),
        vec4(-st, 0.0,  ct, 0.0),
        vec4(0.0, 0.0, 0.0, 1.0)
    );
}

mat4 rotate_z(float t)
{
    float st = sin(t);
    float ct = cos(t);
    return mat4(
        vec4( ct,  st, 0.0, 0.0),
        vec4(-st,  ct, 0.0, 0.0),
        vec4(0.0, 0.0, 1.0, 0.0),
        vec4(0.0, 0.0, 0.0, 1.0)
    );
}

void main() {
    vec4 position = vec4(point.xy, point.z - 25.0, 1);
    gl_Position = view_frustum(radians(45.0), aspect, 0.5, 10.0)
        * translate(translation.x, translation.y, translation.z)
        * rotate_x(rotation.x)
        * rotate_y(rotation.y)
        * rotate_z(rotation.z)
        * view_scale(scale, scale, scale)
        * position;

    float line_position = mod((index - start), len);
    if (line_position < 1.5 || line_position > len - 1.5)
        line_position = 0.0; // trim loop connection
    fade = pow(line_position / len, 1.2);
    gl_PointSize = 200.0 * scale;
}
