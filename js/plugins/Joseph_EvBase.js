var Imported = Imported || {};
Imported.Joseph_EvBase = true;

var Joseph = Joseph || {};
Joseph.EvBase = Joseph.EvBase || {};


(function() {

Joseph.EvBase.R = typeof Reflect === 'object' ? Reflect : null

Joseph.EvBase.ReflectApply = Joseph.EvBase.R && typeof Joseph.EvBase.R.apply === 'function' ? Joseph.EvBase.R.apply : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
}

Joseph.EvBase.ReflectOwnKeys;

if (Joseph.EvBase.R && typeof Joseph.EvBase.R.ownKeys === 'function') {
    Joseph.EvBase.ReflectOwnKeys = Joseph.EvBase.R.ownKeys;
} else if (Object.getOwnPropertySymbols) {
    Joseph.EvBase.ReflectOwnKeys = function ReflectOwnKeys(target) {
        return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
    };
} else {
    Joseph.EvBase.ReflectOwnKeys = function ReflectOwnKeys(target) {
        return Object.getOwnPropertyNames(target);
    };
}

Joseph.EvBase.ProcessEmitWarning = function(warning) {
    if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
		return value !== value;
	};

Joseph.EvBase.EventEmitter = class {
    constructor() {
        Joseph.EvBase.EventEmitter.init.call(this);
    }
    static init() {
        if (this._events === undefined || this._events === Object.getPrototypeOf(this)._events) {
            this._events = Object.create(null);
            this._eventsCount = 0;
        }

        this._maxListeners = this._maxListeners || undefined;
    }
    static listenerCount(emitter, type) {
        if (typeof emitter.listenerCount === "function") {
            return emitter.listenerCount(type);
        } else {
            return listenerCount.call(emitter, type);
        }
    }

    setMaxListeners(n) {
        if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) {
            throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + ".");
        }
        this._maxListeners = n;
        return this;
    }
    getMaxListeners() {
        return Joseph.EvBase._getMaxListeners(this);
    }
    emit(type) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var doError = type === "error";

        var events = this._events;
        if (events !== undefined) doError = doError && events.error === undefined;
        else if (!doError) return false;

        // If there is no 'error' event listener then throw.
        if (doError) {
            var er;
            if (args.length > 0) er = args[0];
            if (er instanceof Error) {
                throw er;
            }

            var err = new Error(
                "Unhandled error." + (er ? " (" + er.message + ")" : "")
            );
            err.context = er;
            throw err;
        }

        var handler = events[type];

        if (handler === undefined) return false;

        if (typeof handler === "function") {
            Joseph.EvBase.ReflectApply(handler, this, args);
        } else {
            var len = handler.length;
            var listeners = Joseph.EvBase.arrayClone(handler, len);
            for (var i = 0; i < len; ++i) Joseph.EvBase.ReflectApply(listeners[i], this, args);
        }

        return true;
    }
    addListener(type, listener) {
        return Joseph.EvBase._addListener(this, type, listener, false);
    }
    prependListener(type, listener) {
        return Joseph.EvBase._addListener(this, type, listener, true);
    }
    once(type, listener) {
        Joseph.EvBase.checkListener(listener);
        this.on(type, Joseph.EvBase._onceWrap(this, type, listener));
        return this;
    }
    prependOnceListener(type, listener) {
        Joseph.EvBase.checkListener(listener);
        this.prependListener(type, Joseph.EvBase._onceWrap(this, type, listener));
        return this;
    }

    removeListener(type, listener) {
        var list, events, position, i, originalListener;

        Joseph.EvBase.checkListener(listener);

        events = this._events;
        if (events === undefined) return this;

        list = events[type];
        if (list === undefined) return this;

        if (list === listener || list.listener === listener) {
            if (--this._eventsCount === 0) this._events = Object.create(null);
            else {
                delete events[type];
                if (events.removeListener) this.emit("removeListener", type, list.listener || listener);
            }
        } else if (typeof list !== "function") {
            position = -1;

            for (i = list.length - 1; i >= 0; i--) {
                if (list[i] === listener || list[i].listener === listener) {
                    originalListener = list[i].listener;
                    position = i;
                    break;
                }
            }

            if (position < 0) return this;

            if (position === 0) list.shift();
            else {
                Joseph.EvBase.spliceOne(list, position);
            }

            if (list.length === 1) events[type] = list[0];

            if (events.removeListener !== undefined) this.emit("removeListener", type, originalListener || listener);
        }

        return this;
    }
    removeAllListeners(type) {
        var listeners, events, i;

        events = this._events;
        if (events === undefined) return this;

        if (events.removeListener === undefined) {
            if (arguments.length === 0) {
                this._events = Object.create(null);
                this._eventsCount = 0;
            } else if (events[type] !== undefined) {
                if (--this._eventsCount === 0) this._events = Object.create(null);
                else delete events[type];
            }
            return this;
        }

        if (arguments.length === 0) {
            var keys = Object.keys(events);
            var key;
            for (i = 0; i < keys.length; ++i) {
                key = keys[i];
                if (key === "removeListener") continue;
                this.removeAllListeners(key);
            }
            this.removeAllListeners("removeListener");
            this._events = Object.create(null);
            this._eventsCount = 0;
            return this;
        }

        listeners = events[type];

        if (typeof listeners === "function") {
            this.removeListener(type, listeners);
        } else if (listeners !== undefined) {
            for (i = listeners.length - 1; i >= 0; i--) {
                this.removeListener(type, listeners[i]);
            }
        }
        return this;
    }
    listeners(type) {
        return Joseph.EvBase._listeners(this, type, true);
    }
    rawListeners(type) {
        return Joseph.EvBase._listeners(this, type, false);
    }
    eventNames() {
        return this._eventsCount > 0 ? Joseph.EvBase.ReflectOwnKeys(this._events) : [];
    }
}

// EventEmitter.EventEmitter = EventEmitter;

Joseph.EvBase.EventEmitter.prototype._events = undefined;
Joseph.EvBase.EventEmitter.prototype._eventsCount = 0;
Joseph.EvBase.EventEmitter.prototype._maxListeners = undefined;

Joseph.EvBase.defaultMaxListeners = 10;

Joseph.EvBase.checkListener = function(listener) {
	if (typeof listener !== "function") {
		throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
	}
}

Object.defineProperty(Joseph.EvBase.EventEmitter, "defaultMaxListeners", {
	enumerable: true,
	get: function () {
		return Joseph.EvBase.defaultMaxListeners;
	},
	set: function (arg) {
		if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
			throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + ".");
		}
		Joseph.EvBase.defaultMaxListeners = arg;
	},
});

Joseph.EvBase._getMaxListeners = function(that) {
	if (that._maxListeners === undefined)
		return Joseph.EvBase.defaultMaxListeners;
	return that._maxListeners;
}

Joseph.EvBase._addListener = function(target, type, listener, prepend) {
	var m;
	var events;
	var existing;

	Joseph.EvBase.checkListener(listener);

	events = target._events;
	if (events === undefined) {
		events = target._events = Object.create(null);
		target._eventsCount = 0;
	} else {
		if (events.newListener !== undefined) {
			target.emit(
				"newListener",
				type,
				listener.listener ? listener.listener : listener
			);

			events = target._events;
		}
		existing = events[type];
	}

	if (existing === undefined) {
		existing = events[type] = listener;
		++target._eventsCount;
	} else {
		if (typeof existing === "function") {
			existing = events[type] = prepend ? [listener, existing] : [existing, listener];
		} else if (prepend) {
			existing.unshift(listener);
		} else {
			existing.push(listener);
		}

		m = Joseph.EvBase._getMaxListeners(target);
		if (m > 0 && existing.length > m && !existing.warned) {
			existing.warned = true;
			var w = new Error(
                "Possible EventEmitter memory leak detected. " +
                existing.length +
                " " +
                String(type) +
                " listeners " +
                "added. Use emitter.setMaxListeners() to " +
                "increase limit"
			);
			w.name = "MaxListenersExceededWarning";
			w.emitter = target;
			w.type = type;
			w.count = existing.length;
			Joseph.EvBase.ProcessEmitWarning(w);
		}
	}

	return target;
}

Joseph.EvBase.EventEmitter.prototype.on = Joseph.EvBase.EventEmitter.prototype.addListener;

Joseph.EvBase.onceWrapper = function() {
	if (!this.fired) {
		this.target.removeListener(this.type, this.wrapFn);
		this.fired = true;
		if (arguments.length === 0) return this.listener.call(this.target);
		return this.listener.apply(this.target, arguments);
	}
}

Joseph.EvBase._onceWrap = function(target, type, listener) {
	var state = {
		fired: false,
		wrapFn: undefined,
		target: target,
		type: type,
		listener: listener,
	};
	var wrapped = Joseph.EvBase.onceWrapper.bind(state);
	wrapped.listener = listener;
	state.wrapFn = wrapped;
	return wrapped;
}

Joseph.EvBase.EventEmitter.prototype.off = Joseph.EvBase.EventEmitter.prototype.removeListener;

Joseph.EvBase._listeners = function(target, type, unwrap) {
	var events = target._events;

	if (events === undefined) return [];

	var evlistener = events[type];
	if (evlistener === undefined) return [];

	if (typeof evlistener === "function")
		return unwrap ? [evlistener.listener || evlistener] : [evlistener];

	return unwrap ? Joseph.EvBase.unwrapListeners(evlistener) : Joseph.EvBase.arrayClone(evlistener, evlistener.length);
}

Joseph.EvBase.EventEmitter.prototype.listenerCount = Joseph.EvBase.listenerCount;
Joseph.EvBase.listenerCount = function(type) {
	var events = this._events;

	if (events !== undefined) {
		var evlistener = events[type];

		if (typeof evlistener === "function") {
			return 1;
		} else if (evlistener !== undefined) {
			return evlistener.length;
		}
	}

	return 0;
}

Joseph.EvBase.arrayClone = function(arr, n) {
	var copy = new Array(n);
	for (var i = 0; i < n; ++i) copy[i] = arr[i];
	return copy;
}

Joseph.EvBase.spliceOne = function(list, index) {
	for (; index + 1 < list.length; index++) list[index] = list[index + 1];
	list.pop();
}

Joseph.EvBase.unwrapListeners = function(arr) {
	var ret = new Array(arr.length);
	for (var i = 0; i < ret.length; ++i) {
		ret[i] = arr[i].listener || arr[i];
	}
	return ret;
}

})();

// Joseph.PlanEmitter = class extends Joseph.EvBase.EventEmitter {
// 	constructor(seconds=360, interval=1000) {
// 		super();
// 		this.totalSeconds = seconds;
// 		this.remainingSeconds = seconds;
// 		this.interval = interval;
// 		this.timer = null;
// 		this.isRunning = false;
// 	}

// 	start() {
// 		console.log(`Countdown Start or Continue. ${this.remainingSeconds}s Remain.`);
// 		if (this.isRunning) return;
// 		this.isRunning = true;

// 		this.timer = setInterval(() => {
// 			if (this.remainingSeconds > 0) {
// 				this.emit("tick", this.remainingSeconds);
// 				this.remainingSeconds--;
//                 console.log(this.remainingSeconds);
// 			} else {
// 				this.stop();
// 				this.emit("done");
// 			}
// 		}, this.interval);
// 	}

// 	stop() {
// 		console.log(`Countdown Stop or Reset. ${this.remainingSeconds}s Remain.`);
// 		if (this.timer) {
//             clearInterval(this.timer);
// 			this.isRunning = false;
// 		}

// 		if (this.remainingSeconds === 0) {
// 			console.log("Countdown Over!");
// 		}
// 	}

// 	reset() {
// 		this.stop();
// 		this.remainingSeconds = this.totalSeconds;
// 		// this.emit("reset", this.remainingSeconds);
// 	}

// 	getTimeRemaining() {
// 		return this.remainingSeconds;
// 	}
// };

// eventEmitter = new Joseph.PlanEmitter(seconds=360, interval=1000);

// eventEmitter.start();