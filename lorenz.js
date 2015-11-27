function lorenz(y) {
    var sigma = 10;
    var beta = 8 / 3;
    var rho = 28;
    return [sigma * (y[1] - y[0]),
            y[0] * (rho - y[2]) - y[1],
            y[0] * y[1] - beta * y[2]];
}

function rk4(f, y, h) {
    function add3(a, b) {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }

    function scale3(v, s) {
        return [v[0] * s, v[1] * s, v[2] * s];
    }
    var k1 = f(y);
    var k2 = f(add3(y, scale3(k1, h / 2)));
    var k3 = f(add3(y, scale3(k2, h / 2)));
    var k4 = f(add3(y, scale3(k3, h)));
    var sum = add3(add3(k1, scale3(k2, 2)), add3(scale3(k3, 3), k4));
    return add3(y, scale3(sum, h / 6));
};

function $(s) {
    /* dumb jQuery polyfill */
    return [document.querySelector(s)];
};

function Lorenz(y) {
    var igloo = Lorenz.igloo;
    this.buffers = {
        tail: igloo.array(),
        head: igloo.array()
    };
    this.y = y;
    this.tail = y.slice(0);
    this.color = Lorenz.colors[Lorenz.colori++ % Lorenz.colors.length];
    this.color[0] = this.color[0] / 255;
    this.color[1] = this.color[1] / 255;
    this.color[2] = this.color[2] / 255;
    this.tick = 0;
}

Lorenz.prototype.length = 100;

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

Lorenz.igloo = (function() {
    var igloo = new Igloo($('#lorenz')[0]);
    var gl = igloo.gl;
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return igloo;
}());

Lorenz.programs = {
    line: Lorenz.igloo.program('identity.vert', 'tail.frag'),
    head: Lorenz.igloo.program('identity.vert', 'head.frag')
};

Lorenz.prototype.step = function(t) {
    this.tick++;
    this.y = rk4(lorenz, this.y, t);
    this.tail.push(this.y[0]);
    this.tail.push(this.y[1]);
    this.tail.push(this.y[2]);
    if (this.tail.length > this.length * 3)
        this.tail = this.tail.slice(this.length * -3);
};

Lorenz.prototype.clear = function() {
    var gl = Lorenz.igloo.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
};

Lorenz.prototype.drawTail = function() {
    var gl = Lorenz.igloo.gl;
    this.buffers.tail.update(this.tail);
    Lorenz.programs.line.use()
        .attrib('point', this.buffers.tail, 3)
        .uniform('color', this.color)
        .draw(gl.LINE_STRIP, this.tail.length / 3);
};

Lorenz.prototype.drawHead = function() {
    var gl = Lorenz.igloo.gl;
    this.buffers.head.update(this.y);
    Lorenz.programs.head.use()
        .attrib('point', this.buffers.head, 3)
        .uniform('color', this.color)
        .draw(gl.POINTS, 1);
};

var curves = (function(ncurves) {
    var curves = [];
    var orig = [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5];
    for (var i = 0; i < ncurves; i++) {
        curves.push(new Lorenz([
            orig[0] + (Math.random() - 0.5) / 10000,
            orig[1] + (Math.random() - 0.5) / 10000,
            orig[2] + (Math.random() - 0.5) / 10000,
        ]));
    }
    function go() {
        curves[0].clear();
        for (var i = 0; i < curves.length; i++) {
            curves[i].step(0.004);
            curves[i].step(0.004);
            curves[i].step(0.004);
            curves[i].drawTail();
        }
        for (var i = 0; i < curves.length; i++) {
            curves[i].drawHead();
        }
        requestAnimationFrame(go);
    }
    go();
    return curves;
}(Lorenz.colors.length));
