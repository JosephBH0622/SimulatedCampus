var Imported = Imported || {};
Imported.Joseph_EvHub = true;

var Joseph = Joseph || {};
Joseph.EvBase = Joseph.EvBase || {};
Joseph.EvHub = Joseph.EvHub || {};

//-----------------------------------------------------------------------------
//  CODE STUFFS
//-----------------------------------------------------------------------------
(function() {

Joseph.EvHub.PlanEmitter = class extends Joseph.EvBase.EventEmitter {
	constructor(seconds=360, interval=1000) {
		super();
		this.totalSeconds = seconds;
		this.remainingSeconds = seconds;
		this.interval = interval;
		this.timer = null;
		this.isRunning = false;
	}

	start() {
		console.log(`Countdown Start or Continue. ${this.remainingSeconds}s Remain.`);
		if (this.isRunning) return;
		this.isRunning = true;

		this.timer = setInterval(() => {
			if (this.remainingSeconds > 0) {
				this.emit("tick", this.remainingSeconds);
				this.remainingSeconds--;
			} else {
				this.stop();
				this.emit("done");
			}
		}, this.interval);
	}

	stop() {
		console.log(`Countdown Stop or Reset. ${this.remainingSeconds}s Remain.`);
		if (this.timer) {
            clearInterval(this.timer);
			this.isRunning = false;
		}

		if (this.remainingSeconds === 0) {
			console.log("Countdown Over!");
		}
	}

	reset() {
		this.stop();
		this.remainingSeconds = this.totalSeconds;
		// this.emit("reset", this.remainingSeconds);
	}

	getTimeRemaining() {
		return this.remainingSeconds;
	}
};

})();