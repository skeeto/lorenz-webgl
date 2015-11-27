function lorenz(varargin)
    sigma = 10;
    beta = 8 / 3;
    rho = 28;
    f = @(x, t) [sigma*(x(2) - x(1)); x(1)*(rho - x(3)) - x(2); x(1)*x(2) - beta*x(3)];
    t = 0:(1/600):50;
    tail = 1500;
    size = 10;
    colors = lines(nargin);

    x = {};
    for n = 1:nargin
        x{n} = lsode(f, varargin{n}, t);
    end
    full = cell2mat(x);
    ax = [min(full(:, 1)) max(full(:, 1))];
    ay = [min(full(:, 2)) max(full(:, 2))];
    az = [min(full(:, 3)) max(full(:, 3))];

    clf();
    for i = 1:length(t)
        cla();
        hold('on');
        axis('square');
        axis('off');
        xlim(ax);
        ylim(ay);
        zlim(az);
        s = max(1, i - tail);
        for n = 1:nargin
            plot3(x{n}(s:i, 1), x{n}(s:i, 2), x{n}(s:i, 3));
            plot3(x{n}(i, 1), x{n}(i, 2), x{n}(i, 3), '.', ...
                  'MarkerSize', size, 'Color', colors(n, :));
        end
        %title(sprintf('t = %f', t(i)));
        view([cos(t(i)) sin(t(i)) (az(2)-az(1))/2]);
        drawnow();
        if mod(i, 4) == 0
            file = sprintf('frame-%08d.png', i)
            print('-dpng', file, '-r150');
        end
    end
end
