/**
 * @param {canvas} HTMLCanvasElement
 * @returns {Lorenz}
 */
function Lorenz(canvas) {
    var gl = canvas.getContext('webgl') ||
             canvas.getContext('experimental-webgl');
    if (gl == null)
        throw new Error('Could not create WebGL context.');
    this.gl = gl;
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.params = {
        sigma: 10,
        beta: 8 / 3,
        rho: 28,
        step_size: 0.002,
        steps_per_frame: 3,
        paused: false
    };
    this.display = {
        scale: 1 / 25,
        rotation: [1.65, 3.08, -0.93],
        rotationd: [0, 0, 0],
        translation: [0, 0.075, 1.81],
        draw_heads: false,
        damping: true,
        _length: 512 // change through length getter/setter
    };

    this.solutions = [];
    this.tail = new Float32Array(0);
    this.tail_buffer = gl.createBuffer();
    this.tail_index = 0;
    this.tail_colors = new Float32Array(0);
    this.tail_colors_buffer = gl.createBuffer();
    var length = this.display._length;
    this.tail_index_buffer = Lorenz.create_index_array(gl, length);
    this.tail_element_buffer = Lorenz.create_element_array(gl, length);
    this.head = new Float32Array(0);
    this.head_buffer = gl.createBuffer();
    this.tail_length = new Float32Array(0);

    this.programs = {};
    var shaders = [
        'glsl/project.vert',
        'glsl/tail.vert',
        'glsl/tail.frag',
        'glsl/head.vert',
        'glsl/head.frag'
    ];
    Lorenz.fetch(shaders, function(project, tail_v, tail_f, head_v, head_f) {
        this.programs.tail = Lorenz.compile(gl, project + tail_v, tail_f);
        this.programs.head = Lorenz.compile(gl, project + head_v, head_f);
        /* Both use two attrib arrays, so just turn them on now. */
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        this.ready = true;
    }.bind(this));

    this.frame = 0;
    this.fps = 0;
    this.accum = 0;
    this.second = Math.floor(Date.now() / 1000);
    this.ready = false;
}

/**
 * Fetch the content for each URL and invoke the callback with the results.
 * @param {String[]} urls
 * @param {Function} callback called with one argument per URL
 * @returns {Array} array that will contain the results
 */
Lorenz.fetch = function(urls, callback) {
    var results = [];
    var countdown = urls.length;
    for (var i = 0; i < urls.length; i++) {
        results.push(null);
        (function(i) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', urls[i], true);
            xhr.onload = function() {
                results[i] = xhr.responseText;
                if (--countdown === 0)
                    callback.apply(results, results);
            };
            xhr.send();
        }(i));
    }
    return results;
};

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} vert
 * @param {string} frag
 * @returns {Object}
 */
Lorenz.compile = function(gl, vert, frag) {
    var v = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(v, vert);
    var f = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(f, frag);
    gl.compileShader(v);
    if (!gl.getShaderParameter(v, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(v));
    gl.compileShader(f);
    if (!gl.getShaderParameter(f, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(f));
    var p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(p));
    var result = {
        program: p,
        attrib: {},
        uniform: {}
    };
    var nattrib = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (var a = 0; a < nattrib; a++) {
        var name = gl.getActiveAttrib(p, a).name;
        var location = gl.getAttribLocation(p, name);
        result.attrib[name] = location;
    }
    var nuniform = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var u = 0; u < nuniform; u++) {
        name = gl.getActiveUniform(p, u).name;
        location = gl.getUniformLocation(p, name);
        result.uniform[name] = location;
    }
    return result;
};

/**
 * @returns {WebGLBuffer}
 */
Lorenz.create_element_array = function(gl, length) {
    var data = new Uint16Array(length * 2);
    for (var i = 0; i < data.length; i++)
        data[i] = (length * 2 - i - 1) % length;
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return buffer;
};

/**
 * @returns {WebGLBuffer}
 */
Lorenz.create_index_array = function(gl, length) {
    var data = new Float32Array(length * 2);
    for (var i = 0; i < data.length; i++)
        data[i] = (length * 2 - i - 1) % length;
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
};

/**
 * @returns {number[3]}
 */
Lorenz.generate = function() {
    return [
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
    ];
};

/**
 * @returns {number[3]}
 */
Lorenz.color = function(i) {
    var colors = [
        0x8d, 0xd3, 0xc7,
        0xff, 0xff, 0xb3,
        0xbe, 0xba, 0xda,
        0xfb, 0x80, 0x72,
        0x80, 0xb1, 0xd3,
        0xfd, 0xb4, 0x62,
        0xb3, 0xde, 0x69,
        0xfc, 0xcd, 0xe5,
        0xd9, 0xd9, 0xd9,
        0xbc, 0x80, 0xbd,
        0xcc, 0xeb, 0xc5,
        0xff, 0xed, 0x6f,
        0xff, 0xff, 0xff
    ];
    var base = (i * 3) % colors.length;
    return colors.slice(base, base + 3).map(function(x) { return x / 255; });
};


/**
 * Update s to the next Lorenz state using RK4.
 * Performs no allocations and hopefully JITs very effectively.
 * @param {!number[3]} s
 * @param {!number}    dt
 * @param {!number}    σ
 * @param {!number}    β
 * @param {!number}    ρ
 * @returns {undefined}
 */
Lorenz.lorenz = function(s, dt, σ, β, ρ) {
    function dx(x, y, z) { return σ * (y - x); }
    function dy(x, y, z) { return x * (ρ - z) - y; }
    function dz(x, y, z) { return x * y - β * z; }

    var x = s[0];
    var y = s[1];
    var z = s[2];

    var k1dx = dx(x, y, z);
    var k1dy = dy(x, y, z);
    var k1dz = dz(x, y, z);

    var k2x = x + k1dx * dt / 2;
    var k2y = y + k1dy * dt / 2;
    var k2z = z + k1dz * dt / 2;

    var k2dx = dx(k2x, k2y, k2z);
    var k2dy = dy(k2x, k2y, k2z);
    var k2dz = dz(k2x, k2y, k2z);

    var k3x = x + k2dx * dt / 2;
    var k3y = y + k2dy * dt / 2;
    var k3z = z + k2dz * dt / 2;

    var k3dx = dx(k3x, k3y, k3z);
    var k3dy = dy(k3x, k3y, k3z);
    var k3dz = dz(k3x, k3y, k3z);

    var k4x = x + k3dx * dt;
    var k4y = y + k3dy * dt;
    var k4z = z + k3dz * dt;

    var k4dx = dx(k4x, k4y, k4z);
    var k4dy = dy(k4x, k4y, k4z);
    var k4dz = dz(k4x, k4y, k4z);

    s[0] = x + (k1dx + 2*k2dx + 2*k3dx + k4dx) * dt / 6;
    s[1] = y + (k1dy + 2*k2dy + 2*k3dy + k4dy) * dt / 6;
    s[2] = z + (k1dz + 2*k2dz + 2*k3dz + k4dz) * dt / 6;
};

/**
 * Update the tail WebGL buffer between two indexes.
 * @param {number} a, with a <= b
 * @param {number} b
 */
Lorenz.prototype._update = function(a, b) {
    var gl = this.gl;
    var length = this.display._length;
    var buffer = this.tail.buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tail_buffer);
    if (a == 0 && b == length - 1) {
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.tail);
    } else {
        var sublength = b - a + 1;
        for (var s = 0; s < this.solutions.length; s++)  {
            var offset = s * 3 * length * 4 + 3 * a * 4;
            /* As far as I can tell, this buffer view is optimized out.
             * Therefore no allocation actually happens. Whew!
             */
            var view = new Float32Array(buffer, offset, sublength * 3);
            gl.bufferSubData(gl.ARRAY_BUFFER, offset, view);
        }
    }
};

/**
 * Advance the system state by one frame.
 * @returns {Lorenz} this
 */
Lorenz.prototype.step = function() {
    if (!this.ready)
        return this;
    if (!this.params.paused) {
        var σ = this.params.sigma;
        var β = this.params.beta;
        var ρ = this.params.rho;
        var dt = this.params.step_size;
        var length = this.display._length;
        var tail = this.tail;
        var start_index = this.tail_index;
        var stop_index = 0;
        for (var s = 0; s < this.params.steps_per_frame; s++) {
            var tail_index = this.tail_index;
            this.tail_index = (this.tail_index + 1) % length;
            for (var i = 0; i < this.solutions.length; i++)  {
                Lorenz.lorenz(this.solutions[i], dt, σ, β, ρ);
                var base = i * length * 3 + tail_index * 3;
                tail[base + 0] = this.solutions[i][0];
                tail[base + 1] = this.solutions[i][1];
                tail[base + 2] = this.solutions[i][2];
                var next = this.tail_length[i] + 1;
                this.tail_length[i] = Math.min(next, length);
            }
            stop_index  = tail_index;
        }
        if (stop_index >= start_index) {
            this._update(start_index, stop_index);
        } else {
            this._update(start_index, length - 1);
            this._update(0, stop_index);
        }
    }
    this.display.rotation[0] += this.display.rotationd[0];
    this.display.rotation[1] += this.display.rotationd[1];
    this.display.rotation[2] += this.display.rotationd[2];
    if (this.display.damping) {
        var damping = 0.96;
        this.display.rotationd[0] *= damping;
        this.display.rotationd[1] *= damping;
        this.display.rotationd[2] *= damping;
    }
    this.frame++;
    var second = Math.floor(Date.now() / 1000);
    if (second !== this.second) {
        this.fps = this.accum;
        this.accum = 1;
        this.second = second;
    } else {
        this.accum++;
    }
    return this;
};

/**
 * Renders the current state to the associated WebGL canvas.
 * @returns {Lorenz} this
 */
Lorenz.prototype.draw = function() {
    if (!this.ready)
        return this;

    var gl = this.gl;
    var width = gl.canvas.clientWidth;
    var height = gl.canvas.clientHeight;
    if (gl.canvas.width != width || gl.canvas.height != height) {
        gl.canvas.width = width;
        gl.canvas.height = height;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);

    var count = this.solutions.length;
    if (count == 0)
        return this;

    var aspect = gl.canvas.width / gl.canvas.height;
    var length = this.display._length;
    var scale = this.display.scale;
    var rotation = this.display.rotation;
    var translation = this.display.translation;
    var rho = this.params.rho;
    var start = (this.tail_index - 1 + length) % length;

    gl.useProgram(this.programs.tail.program);
    var attrib = this.programs.tail.attrib;
    var uniform = this.programs.tail.uniform;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tail_index_buffer);
    gl.vertexAttribPointer(attrib.index, 1, gl.FLOAT, false, 0,
                           (length - start - 1) * 4);
    gl.uniform1f(uniform.aspect, aspect);
    gl.uniform1f(uniform.scale, scale);
    gl.uniform3fv(uniform.rotation, rotation);
    gl.uniform3fv(uniform.translation, translation);
    gl.uniform1f(uniform.rho, rho);
    gl.uniform1f(uniform.max_length, length);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tail_buffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.tail_element_buffer);
    for (var i = 0; i < count; i++) {
        var r = this.tail_colors[i * 3 + 0];
        var g = this.tail_colors[i * 3 + 1];
        var b = this.tail_colors[i * 3 + 2];
        var offset = i * length * 4 * 3;
        gl.uniform3f(uniform.color, r, g, b);
        gl.uniform1f(uniform.tail_length, this.tail_length[i]);
        gl.vertexAttribPointer(attrib.point, 3, gl.FLOAT, false, 0, offset);
        gl.drawElements(gl.LINE_STRIP, length, gl.UNSIGNED_SHORT,
                        (length - start - 1) * 2);
    }

    if (this.display.draw_heads) {
        gl.useProgram(this.programs.head.program);
        attrib = this.programs.head.attrib;
        uniform = this.programs.head.uniform;
        for (var s = 0; s < count; s++) {
            var base = s * length * 3 + start * 3;
            this.head[s * 3 + 0] = this.tail[base + 0];
            this.head[s * 3 + 1] = this.tail[base + 1];
            this.head[s * 3 + 2] = this.tail[base + 2];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.head_buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.head);
        gl.vertexAttribPointer(attrib.point, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tail_colors_buffer);
        gl.vertexAttribPointer(attrib.color, 3, gl.FLOAT, false, 0, 0);
        gl.uniform1f(uniform.aspect, aspect);
        gl.uniform1f(uniform.scale, scale);
        gl.uniform3fv(uniform.rotation, rotation);
        gl.uniform3fv(uniform.translation, translation);
        gl.uniform1f(uniform.rho, rho);
        gl.drawArrays(gl.POINTS, 0, count);
    }

    return this;
};

/**
 * Adjust all buffer sizes if needed.
 */
Lorenz.prototype._grow_buffers = function() {
    function next2(x) {
        return Math.pow(2, Math.ceil(Math.log(x) * Math.LOG2E));
    }
    var gl = this.gl;
    var count = next2(this.solutions.length);
    var length = this.display._length;
    if (this.tail.length < count * length * 3) {
        var old_tail = this.tail;
        this.tail = new Float32Array(count * length * 3);
        this.tail.set(old_tail);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tail_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, count * length * 4 * 3, gl.DYNAMIC_DRAW);
        this._update(0, length - 1);
    }
    if (this.tail_length.length < count) {
        var old_tail_length = this.tail_length;
        this.tail_length = new Float32Array(count);
        this.tail_length.set(old_tail_length);
    }
    if (this.tail_colors.length < count * 3) {
        this.tail_colors = new Float32Array(count * 3);
        for (var i = 0; i < this.tail_colors.length; i++) {
            var color = Lorenz.color(i);
            this.tail_colors[i * 3 + 0] = color[0];
            this.tail_colors[i * 3 + 1] = color[1];
            this.tail_colors[i * 3 + 2] = color[2];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tail_colors_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, count * 4 * 3, gl.STATIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.tail_colors);
    }
    if (this.head.length < count * 3) {
        // No copy needed since it's always set right before draw.
        this.head = new Float32Array(count * 3);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.head_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, count * 3 * 4, gl.DYNAMIC_DRAW);
    }
};

/**
 * Add a new solution to the system.
 * @param {number[3]} s
 * @returns {Lorenz} this
 */
Lorenz.prototype.add = function(s) {
    var gl = this.gl;
    var length = this.display._length;
    this.solutions.push(s.slice(0));
    this._grow_buffers();
    return this;
};

/**
 * Change the tail lengths.
 * @param {number} length
 * @returns {Lorenz} this
 */
Lorenz.prototype._trim = function(length) {
    function mod(x, y) { // properly handles negatives
        return x - y * Math.floor(x / y);
    }
    var count = this.solutions.length;
    var oldlength = this.display._length;
    this.display._length = length;
    var old_tail = new Float32Array(this.tail.length);
    old_tail.set(this.tail);
    this._grow_buffers();
    var actual = Math.min(length, oldlength);
    for (var s = 0; s < count; s++) {
        for (var n = 0; n < actual; n++) {
            var i = mod(this.tail_index - n - 1, oldlength);
            var o = actual - n - 1;
            var obase = s * length * 3 + o * 3;
            var ibase = s * oldlength * 3 + i * 3;
            this.tail[obase + 0] = old_tail[ibase + 0];
            this.tail[obase + 1] = old_tail[ibase + 1];
            this.tail[obase + 2] = old_tail[ibase + 2];
        }
        this.tail_length[s] = Math.min(this.tail_length[s], actual);
    }
    this.tail_index = actual % length;
    this.tail_index_buffer = Lorenz.create_index_array(this.gl, length);
    this.tail_element_buffer = Lorenz.create_element_array(this.gl, length);
    this._update(0, length - 1);
    return this;
};

/**
 * Remove all solutions.
 * @returns {Lorenz} this
 */
Lorenz.prototype.empty = function() {
    this.solutions = [];
    this.tail = new Float32Array(0);
    this.tail_index = 0;
    this.tail_colors = new Float32Array(0);
    this.head = new Float32Array(0);
    this.tail_length = new Float32Array(0);
    return this;
};

Object.defineProperty(Lorenz.prototype, 'length', {
    get: function() {
        return this.display._length;
    },
    set: function(v) {
        this._trim(v);
        return this.display._length;
    }
});

/**
 * Initialize and start running a demo.
 * @returns {Lorenz}
 */
Lorenz.run = function(canvas) {
    var lorenz = new Lorenz(canvas);
    for (var i = 0; i < 13; i++)
        lorenz.add(Lorenz.generate());
    function go() {
        lorenz.step();
        lorenz.draw();
        requestAnimationFrame(go);
    }
    requestAnimationFrame(go);
    return lorenz;
};
