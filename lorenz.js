function Lorenz(y) {
    var igloo = Lorenz.igloo;
    this.buffers = {
        tail: igloo.array(),
        index: igloo.array(),
        head: igloo.array()
    };
    this.y = y;
    this.tail = {
        i: 0,
        values: [],
        length: 0
    };
    this.trim(500);
    this.color = Lorenz.colors[Lorenz.colori++ % Lorenz.colors.length].slice(0);
    this.color[0] = this.color[0] / 255;
    this.color[1] = this.color[1] / 255;
    this.color[2] = this.color[2] / 255;
    this.tick = 0;
}

Lorenz.colori = 0;
Lorenz.colors = [
    [0x8d, 0xd3, 0xc7],
    [0xff, 0xff, 0xb3],
    [0xbe, 0xba, 0xda],
    [0xfb, 0x80, 0x72],
    [0x80, 0xb1, 0xd3],
    [0xfd, 0xb4, 0x62],
    [0xb3, 0xde, 0x69],
    [0xfc, 0xcd, 0xe5],
    [0xd9, 0xd9, 0xd9],
    [0xbc, 0x80, 0xbd],
    [0xcc, 0xeb, 0xc5],
    [0xff, 0xed, 0x6f],
    [0xff, 0xff, 0xff]
];

Lorenz.scale = 1 / 25;
Lorenz.rotation = [1.65, 3.08, -0.93];
Lorenz.rotationd = [0, 0, 0];
Lorenz.translation = [-0.03, -0.07, 1.81];

Lorenz.paused = false;
Lorenz.showHeads = true;

Lorenz.sigma = 10;
Lorenz.beta = 8 / 3;
Lorenz.rho = 28;

Lorenz.lorenz = function(y, h) {
    var sigma = Lorenz.sigma;
    var beta = Lorenz.beta;
    var rho = Lorenz.rho;
    function f(y) {
        return [sigma * (y[1] - y[0]),
                y[0] * (rho - y[2]) - y[1],
                y[0] * y[1] - beta * y[2]];
    };
    function add3(a, b) {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }
    function scale3(v, s) {
        return [v[0] * s, v[1] * s, v[2] * s];
    }
    /* RK4 integration */
    var k1 = f(y);
    var k2 = f(add3(y, scale3(k1, h / 2)));
    var k3 = f(add3(y, scale3(k2, h / 2)));
    var k4 = f(add3(y, scale3(k3, h)));
    var sum = add3(add3(k1, scale3(k2, 2)), add3(scale3(k3, 3), k4));
    return add3(y, scale3(sum, h / 6));
};

Lorenz.igloo = (function() {
    var igloo = new Igloo(document.querySelector('#lorenz'));
    var gl = igloo.gl;
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    var lastlast = null;
    var last = null;
    var lastbuttons = null;
    igloo.gl.canvas.addEventListener('mousemove', function(e) {
        var p = {x: e.pageX, y: e.pageY};
        if (last) {
            var dy = (last.y - p.y);
            var dx = (last.x - p.x);
            if (e.buttons & 4) {
                var scale = 1 / 200;
                if (e.shiftKey)
                    Lorenz.translation[2] += dy * scale;
                else
                    Lorenz.translation[0] += dx * -scale;
                Lorenz.translation[1] += dy * scale;       
            } else if (e.buttons) {
                var scale = 1 / 100;
                if (e.shiftKey)
                    Lorenz.rotation[1] += dx * -scale;
                else
                    Lorenz.rotation[2] += dx * scale;
                Lorenz.rotation[0] += dy * scale;
            }
        }
        lastbuttons = e.buttons;
        lastlast = last;
        last = p;
    });
    igloo.gl.canvas.addEventListener('mouseup', function(e) {
        var scale = 1 / 100;
        if (lastlast && !(lastbuttons & 4)) {
            Lorenz.rotationd[2] = (lastlast.x - last.x) * scale;
            Lorenz.rotationd[0] = (lastlast.y - last.y) * scale;
        }
        last = null;
    });
    igloo.gl.canvas.addEventListener('touchmove', function(e) {
        var p = {x: e.touches[0].clientX, y: e.touches[0].clientY};
        console.log(p);
        if (last) {
            var scale = 1 / 100;
            Lorenz.rotation[2] += (last.x - p.x) * scale;
            Lorenz.rotation[0] += (last.y - p.y) * scale;
        }
        lastlast = last;
        last = p;
    });
    igloo.gl.canvas.addEventListener('touchend', function() {
        var scale = 1 / 100;
        if (lastlast) {
            Lorenz.rotationd[2] = (lastlast.x - last.x) * scale;
            Lorenz.rotationd[0] = (lastlast.y - last.y) * scale;
        }
        last = null;
    });
    igloo.gl.canvas.addEventListener('DOMMouseScroll', function(e) {
        Lorenz.scale *= e.detail > 0 ? 0.95 : 1.1;
    });
    igloo.gl.canvas.addEventListener('mousewheel', function(e) {
        Lorenz.scale *= e.wheelDelta < 0 ? 0.95 : 1.1;
    });
    window.addEventListener('keypress', function(e) {
        if (e.which == 'a'.charCodeAt(0))
            Lorenz.addRandom();
        else if (e.which == 'c'.charCodeAt(0))
            Lorenz.addClone();
        else if (e.which == 'C'.charCodeAt(0))
            Lorenz.clearAll();
        else if (e.which == ' '.charCodeAt(0))
            Lorenz.paused = !Lorenz.paused;
        else if (e.which == 'h'.charCodeAt(0))
            Lorenz.showHeads = !Lorenz.showHeads;
    });
    return igloo;
}());

Lorenz.programs = {
    line: Lorenz.igloo.program('tail.vert', 'tail.frag'),
    head: Lorenz.igloo.program('tail.vert', 'head.frag')
};

Lorenz.clear = function() {
    var gl = Lorenz.igloo.gl;
    var width = gl.canvas.clientWidth;
    var height = gl.canvas.clientHeight;
    if (gl.canvas.width != width || gl.canvas.height != height) {
        gl.canvas.width = width;
        gl.canvas.height = height;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
};

Lorenz.aspect = function() {
    return Lorenz.igloo.gl.canvas.width / Lorenz.igloo.gl.canvas.height;
};

Lorenz.prototype.step = function(t) {
    this.tick++;
    this.y = Lorenz.lorenz(this.y, t);
    this.tail.values[this.tail.i * 3 + 0] = this.y[0];
    this.tail.values[this.tail.i * 3 + 1] = this.y[1];
    this.tail.values[this.tail.i * 3 + 2] = this.y[2];
    this.tail.i = (this.tail.i + 1) % (this.tail.values.length / 3);
    if (this.tail.length < this.tail.values.length / 3)
        this.tail.length++;
};

Lorenz.prototype.drawTail = function() {
    var gl = Lorenz.igloo.gl;
    this.buffers.tail.update(this.tail.values);
    Lorenz.programs.line.use()
        .attrib('point', this.buffers.tail, 3)
        .attrib('index', this.buffers.index, 1)
        .uniform('aspect', Lorenz.aspect())
        .uniform('scale', Lorenz.scale)
        .uniform('rotation', Lorenz.rotation)
        .uniform('translation', Lorenz.translation)
        .uniform('color', this.color)
        .uniform('len', this.tail.length)
        .uniform('start', this.tail.i - 1)
        .draw(gl.LINE_LOOP, this.tail.length);
};

Lorenz.prototype.drawHead = function() {
    var gl = Lorenz.igloo.gl;
    this.buffers.head.update(this.y);
    Lorenz.programs.head.use()
        .attrib('point', this.buffers.head, 3)
        .uniform('aspect', Lorenz.aspect())
        .uniform('scale', Lorenz.scale)
        .uniform('rotation', Lorenz.rotation)
        .uniform('translation', Lorenz.translation)
        .uniform('color', this.color)
        .draw(gl.POINTS, 1);
};

Lorenz.prototype.trim = function(length) {
    function mod(x, y) {
        // properly handles negatives
        return x - y * Math.floor(x / y);
    }
    var values = new Float32Array(length * 3);
    var newlen = Math.min(length, this.tail.length);
    for (var n = 0; n < newlen; n++) {
        var i = mod(this.tail.i - n - 1, this.tail.values.length / 3);
        var o = newlen - n - 1;
        values[o * 3 + 0] = this.tail.values[i * 3 + 0];
        values[o * 3 + 1] = this.tail.values[i * 3 + 1];
        values[o * 3 + 2] = this.tail.values[i * 3 + 2];
    }
    this.tail.i = newlen % (values.length / 3);
    this.tail.values = values;
    this.tail.length = newlen;
    var index = new Array(this.tail.values.length / 3);
    for (var i = 0; i < index.length; i++)
        index[i] = i;
    this.buffers.index.update(index);
};

Lorenz.curves = (function(ncurves) {
    var curves = [];
    var orig = [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5];
    for (var i = 0; i < ncurves; i++) {
        curves.push(new Lorenz([
            orig[0] + (Math.random() - 0.5) / 100,
            orig[1] + (Math.random() - 0.5) / 100,
            orig[2] + (Math.random() - 0.5) / 100,
        ]));
    }
    function go() {
        Lorenz.rotation[0] += Lorenz.rotationd[0];
        Lorenz.rotation[1] += Lorenz.rotationd[1];
        Lorenz.rotation[2] += Lorenz.rotationd[2];
        var decay = 0.95;
        Lorenz.rotationd[0] *= decay;
        Lorenz.rotationd[1] *= decay;
        Lorenz.rotationd[2] *= decay;
        Lorenz.clear();
        for (var i = 0; i < curves.length; i++) {
            if (!Lorenz.paused) {
                curves[i].step(0.002);
                curves[i].step(0.002);
                curves[i].step(0.002);
            }
            curves[i].drawTail();
        }
        if (Lorenz.showHeads)
            for (var i = 0; i < curves.length; i++) 
                curves[i].drawHead();
        requestAnimationFrame(go);
    }
    go();
    return curves;
}(Lorenz.colors.length));

/* High-level Utility Functions */

Lorenz.trimAll = function(length) {
    Lorenz.curves.forEach(function(c) {
        c.trim(length);
    });
};

Lorenz.addRandom = function() {
    var y = [
        Math.random() * 50,
        Math.random() * 50,
        Math.random() * 50,
    ];
    Lorenz.curves.push(new Lorenz(y));
};

Lorenz.addClone = function() {
    var i = Math.floor(Math.random() * Lorenz.curves.length);
    var y = Lorenz.curves[i].y.slice(0);
    y[0] += (Math.random() - 0.5) / 10000;
    y[1] += (Math.random() - 0.5) / 10000;
    y[2] += (Math.random() - 0.5) / 10000;
    Lorenz.curves.push(new Lorenz(y));
};

Lorenz.clearAll = function() {
    Lorenz.curves.length = 0;
};
