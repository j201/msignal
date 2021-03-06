var tape = require('tape');
var signal = require('./lib');

function countTo(x, time) {
	return signal(function loop(resolve, n) {
		n = n || 0;
		resolve(n);
		if (n < x) 
			setTimeout(function() { return loop(resolve, n + 1); }, time);
	});
}

function shouldProduce(t, signal, xs, message) {
	signal.fold(function(acc, x) { return acc.concat([x]); }, [])
		.listen(function(sxs) {
			if (sxs.length === xs.length)
				t.deepEqual(sxs, xs, message);
		});
}

tape("Monad laws", function(t) {
	t.plan(3);

	shouldProduce(t,
				  signal.unit(2).bind(function(x) { return countTo(x, 0); }),
				  [0,1,2],
				  "bind(unit(a), f) <=> f(a)");

	shouldProduce(t,
				  countTo(2, 0).bind(signal.unit),
				  [0,1,2],
				  "bind(m, unit) <=> m");
	
	var sDouble = function(x) { return signal.unit(x*2); };
	var sInc = function(x) { return signal.unit(x+1); };

	shouldProduce(t,
				  countTo(2, 0).bind(function(x) { return sDouble(x).bind(sInc); }),
				  [1,3,5],
				  "bind(bind(m, f), g) <=> bind(m, x => bind(f(x), g))");
});

tape("Functor laws", function(t) {
	t.plan(2);

	shouldProduce(t,
				  countTo(2, 0).fmap(function(x) { return x; }),
				  [0,1,2],
				  "fmap(x => x) <=> x => x");
	
	shouldProduce(t,
				  countTo(2, 0).fmap(function(x) { return x*2; }).fmap(function(x) { return x+1; }),
				  [1,3,5],
				  "fmap(comp(f, g)) <=> comp(fmap(f), fmap(g))");
});

tape("Applicative laws", function(t) {
	t.plan(4);

	shouldProduce(t,
				  signal.unit(function(x) { return x; }).apply(countTo(2, 0)),
				  [0,1,2],
				  "apply(unit(x => x), s) <=> s");
	
	var sDouble = signal.unit(function(x) { return x*2; });
	var sInc = signal.unit(function(x) { return x+1; });
	shouldProduce(t,
				  signal.unit(function(f) { return function(g) { return function(x) { return f(g(x)); }; }; })
					.apply(sDouble).apply(sInc).apply(countTo(2, 0)),
				  [2, 4, 6],
				  "unit(comp).apply(s).apply(t).apply(u) <=> s.apply(t.apply(u))");

	shouldProduce(t,
				  sDouble.apply(signal.unit(2)),
				  [4],
				  "unit(f).apply(unit(x)) <=> unit(f(x))");

	shouldProduce(t,
				  signal.unit(function(f) { return f(2); }).apply(sDouble),
				  [4],
				  "unit(f => f(x)).apply(s) <=> s.apply(unit(x))");
});

tape("Other functions", function(t) {
	t.plan(3);

	shouldProduce(t,
				  countTo(3, 0).fold(function(a, b) { return a + b; }, 0),
				  [0,1,3,6],
				  "fold");

	shouldProduce(t,
				  signal.combine(countTo(1, 300), countTo(2, 0)),
				  [[0, 0], [0, 1], [0, 2], [1, 2]],
				  "combine");

	shouldProduce(t,
				  signal.lift(function(a, b) { return a + b*3; })(countTo(2, 0), countTo(2, 300)),
				  [0, 1, 2, 5, 8],
				  "lift");
});
