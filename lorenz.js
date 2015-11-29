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
    this.trim(Lorenz.tails);
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
Lorenz.translation = [0, 0.075, 1.81];

Lorenz.stepSize = 0.002;
Lorenz.stepPerFrame = 3;
Lorenz.paused = false;
Lorenz.showHeads = true;
Lorenz.damping = true;
Lorenz.tails = 512;

Lorenz.sigma = 10;
Lorenz.beta = 8 / 3;
Lorenz.rho = 28;

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
        e.preventDefault();
        var p = {x: e.pageX, y: e.pageY, t: Date.now() / 1000};
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
                Lorenz.rotationd[0] = 0;
                Lorenz.rotationd[1] = 0;
                Lorenz.rotationd[2] = 0;
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
        e.preventDefault();
        var scale = 1 / 5000;
        if (lastlast && last && !(lastbuttons & 4)) {
            var dx = lastlast.x - last.x;
            var dy = lastlast.y - last.y;
            var dt = Date.now() / 1000 - lastlast.t;
            Lorenz.rotationd[2] = dx / dt * scale;
            Lorenz.rotationd[0] = dy / dt * scale;
        }
        last = null;
    });
    igloo.gl.canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
        var p = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            t: Date.now() / 1000
        };
        if (last) {
            Lorenz.rotationd[0] = 0;
            Lorenz.rotationd[1] = 0;
            Lorenz.rotationd[2] = 0;
            var scale = 1 / 100;
            Lorenz.rotation[2] += (last.x - p.x) * scale;
            Lorenz.rotation[0] += (last.y - p.y) * scale;
        }
        lastlast = last;
        last = p;
    });
    igloo.gl.canvas.addEventListener('touchend', function(e) {
        var scale = 1 / 5000;
        if (lastlast && last) {
            var dx = lastlast.x - last.x;
            var dy = lastlast.y - last.y;
            var dt = Date.now() / 1000 - lastlast.t;
            Lorenz.rotationd[2] = dx / dt * scale;
            Lorenz.rotationd[0] = dy / dt * scale;
        } else {
            Lorenz.addRandom();
        }
        last = null;
    });
    igloo.gl.canvas.addEventListener('DOMMouseScroll', function(e) {
        e.preventDefault();
        Lorenz.scale *= e.detail > 0 ? 0.95 : 1.1;
    });
    igloo.gl.canvas.addEventListener('mousewheel', function(e) {
        e.preventDefault();
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
        else if (e.which == 'd'.charCodeAt(0))
            Lorenz.damping = !Lorenz.damping;
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

Lorenz.prototype.step = function(dt) {
    this.tick++;
    Lorenz.lorenz(this.y, dt, Lorenz.sigma, Lorenz.beta, Lorenz.rho);
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
        .uniform('rho', Lorenz.rho)
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
        .uniform('rho', Lorenz.rho)
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

/* UI stuff */

function updateSliders() {
    var sigma = document.querySelector('#sigma');
    var beta = document.querySelector('#beta');
    var rho = document.querySelector('#rho');
    sigma.value = Lorenz.sigma;
    beta.value = Lorenz.beta;
    rho.value = Lorenz.rho;
    var sigmaL = document.querySelector('#sigma-label');
    var betaL = document.querySelector('#beta-label');
    var rhoL = document.querySelector('#rho-label');
    sigmaL.innerHTML = sigma.value;
    betaL.innerHTML = beta.value;
    rhoL.innerHTML = rho.value;
}

function slidersHandler(e) {
    var sigma = document.querySelector('#sigma');
    var beta = document.querySelector('#beta');
    var rho = document.querySelector('#rho');
    var sigmaL = document.querySelector('#sigma-label');
    var betaL = document.querySelector('#beta-label');
    var rhoL = document.querySelector('#rho-label');
    Lorenz.sigma = parseFloat(sigma.value);
    Lorenz.beta = parseFloat(beta.value);
    Lorenz.rho = parseFloat(rho.value);
    sigmaL.innerHTML = sigma.value;
    betaL.innerHTML = beta.value;
    rhoL.innerHTML = rho.value;
}

(function() {
    updateSliders();
    var sigma = document.querySelector('#sigma');
    var beta = document.querySelector('#beta');
    var rho = document.querySelector('#rho');
    sigma.addEventListener('input', slidersHandler);
    beta.addEventListener('input', slidersHandler);
    rho.addEventListener('input', slidersHandler);
}());

function tailsHandler(e) {
    var tails = document.querySelector('#tails');
    Lorenz.tails = Math.pow(2, parseFloat(tails.value));
    Lorenz.trimAll(Lorenz.tails);
    var tailsL = document.querySelector('#tails-label');
    tailsL.innerHTML = Lorenz.tails;
}

(function() {
    var tails = document.querySelector('#tails');
    tails.value = Math.log(Lorenz.tails) * Math.LOG2E;
    tails.addEventListener('input', tailsHandler);
    var tailsL = document.querySelector('#tails-label');
    tailsL.innerHTML = Lorenz.tails;
}());

(function() {
    var preset = document.querySelector('#preset');
    preset.addEventListener('change', function() {
        if (preset.value === 'chaos') {
            Lorenz.curves.length = 0;
            Lorenz.addRandom();
            for (var i = 0; i < 31; i++)
                Lorenz.addClone();
        } else if (preset.value === 'gentle') {
            while (Lorenz.curves.length < 32)
                Lorenz.addRandom();
            Lorenz.rotationd[0] = 0;
            Lorenz.rotationd[1] = 0;
            Lorenz.rotationd[2] = 0.007;
            Lorenz.damping = false;
        } else if (preset.value === 'bendy') {
            while (Lorenz.curves.length < 32)
                Lorenz.addRandom();
            Lorenz.sigma = 17.24;
            Lorenz.beta = 1.1;
            Lorenz.rho = 217;
            Lorenz.scale = 1 / 65;
            updateSliders();
        }
    });
}());

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

/* Main loop */

Lorenz.curves = [];

(function() {
    for (var i = 0; i < Lorenz.colors.length; i++)
        Lorenz.addRandom();

    function go() {
        Lorenz.rotation[0] += Lorenz.rotationd[0];
        Lorenz.rotation[1] += Lorenz.rotationd[1];
        Lorenz.rotation[2] += Lorenz.rotationd[2];
        if (Lorenz.damping) {
            var damping = 0.96;
            Lorenz.rotationd[0] *= damping;
            Lorenz.rotationd[1] *= damping;
            Lorenz.rotationd[2] *= damping;
        }
        Lorenz.clear();
        for (var i = 0; i < Lorenz.curves.length; i++) {
            if (!Lorenz.paused) 
                for (var s = 0; s < Lorenz.stepPerFrame; s++)
                    Lorenz.curves[i].step(Lorenz.stepSize);
            Lorenz.curves[i].drawTail();
        }
        if (Lorenz.showHeads)
            for (var i = 0; i < Lorenz.curves.length; i++)
                Lorenz.curves[i].drawHead();
        requestAnimationFrame(go);
    }
    go();
}());

