/*:
 * @plugindesc 在指定时间点触发自定义插件命令
 * @author Joseph
 *
 * @param TotalDuration
 * @desc 总倒计时时间（秒）
 * @default 360
 * @type number
 *
 * @help
 * 使用方法:
 * 1. 设置插件参数：
 *    - TotalDuration: 总倒计时时间（秒）
 * 2. 在事件中使用插件命令: StartSetPlan
 */

var Imported = Imported || {};
Imported.Joseph_SetPlan = true;

var Joseph = Joseph || {};
Joseph.EvBase = Joseph.EvBase || {};
Joseph.EvHub = Joseph.EvHub || {};
Joseph.setPlan = Joseph.setPlan || {};
Joseph.Move = Joseph.Move || {};

(function() {

Joseph.setPlan.totalDuration = Number(PluginManager.parameters("Joseph_SetPlansNew")["TotalDuration"]) || 360;
// 用于分配NPC移动计划的发射器
Joseph.setPlan.EmitHubForPlans = class extends Joseph.EvHub.PlanEmitter {
    constructor(seconds=360, interval=1000) {
        super(seconds, interval);
    }

    start() {
        console.log(`Countdown Start or Continue. ${this.remainingSeconds}s Remain.`);
		if (this.isRunning) return;
		this.isRunning = true;

		this.timer = setInterval(() => {
			if (this.remainingSeconds > 0) {
                // console.log("RemainingSeconds: ", this.remainingSeconds);
				this.emit("moveNPC", this.remainingSeconds);
				this.remainingSeconds--;
			} else {
				this.stop();
                Joseph.CallPluginCommand("SimpleCutscene");
			}
		}, this.interval);
	}
}

Joseph.setPlan.eventEmitter = new Joseph.setPlan.EmitHubForPlans(seconds=360, interval=1000);

Joseph.setPlan.Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
    Joseph.setPlan.Game_Interpreter_pluginCommand.call(this, command, args);
    if (command === "StartSetPlan") {
        // Set the world time.
        Joseph.worldTime = Joseph.worldTime || 1;
        console.log("world Time: ", Joseph.worldTime);

        // Get the world index.
        if (Joseph.worldTime === 1) {
            var worldData = Joseph.initWorld();
            Joseph.worldIndex = worldData.body.world_index;
            // Joseph.worldIndex = "785a1021-e917-49c8-87a3-fb648096d8af";
            $gameVariables.setValue(23, Joseph.worldIndex);
            console.log("World Index: ", Joseph.worldIndex);
        } else if (!$gameVariables.value(23)) {
            Joseph.worldTime = 1;
            return Joseph.CallPluginCommand("StartSetPlan");
        }

        // Init a new Planprocessor to get and process the plan.
        let plan = new Joseph.PlanProcess(worldTime=Joseph.worldTime, worldIndex=Joseph.worldIndex, isGroup=false, isSorted=false, isCreated=true);
        Joseph.worldTime++;
        console.log("Next World Time: ", Joseph.worldTime);

        Joseph.setPlan.eventEmitter.totalSeconds = Joseph.setPlan.totalDuration;
        Joseph.setPlan.eventEmitter.reset();

        if (!Joseph.timeLine.isGroup) {
            Joseph.setPlan.eventEmitter.on("moveNPC", Joseph.setPlan.emitUnGroupPlans);
        } else {
            Joseph.setPlan.eventEmitter.on("moveNPC", Joseph.setPlan.emitGroupPlans);
        }

        Joseph.setPlan.eventEmitter.start();
    }
};

Joseph.setPlan.Scene_Map_callMenu = Scene_Map.prototype.callMenu;
Scene_Map.prototype.callMenu = function() {
    if (Joseph.setPlan.eventEmitter.isRunning) {
        Joseph.setPlan.eventEmitter.stop();
    }
    Joseph.Move.pauseGlobalUpdate();
    Joseph.setPlan.Scene_Map_callMenu.call(this);
};

Joseph.setPlan.Scene_Menu_popScene = Scene_Menu.prototype.popScene;
Scene_Menu.prototype.popScene = function() {
    // 在调用原始方法后继续计时器
    Joseph.setPlan.Scene_Menu_popScene.call(this);
    if (!Joseph.setPlan.eventEmitter.isRunning && Joseph.setPlan.eventEmitter.remainingSeconds !== Joseph.setPlan.eventEmitter.totalSeconds) {
        Joseph.setPlan.eventEmitter.start();
    }
    Joseph.Move.resumeGlobalUpdate();
};

Joseph.setPlan.emitUnGroupPlans = function(remainingSeconds) {
    // console.log("Successfully")
    let eventList = Joseph.timeLine.eventList;
    let commandList = [];
    for (var index = 0; index < eventList.length; index++) {
        if (Math.floor(eventList[index].time * Joseph.setPlan.totalDuration) === remainingSeconds) {
            commandList.push(...Joseph.setPlan.createTempMove(eventList[index]));
        }

        if (Math.floor(eventList[index].time * Joseph.setPlan.totalDuration) < remainingSeconds) break;
    }

    commandList.forEach(cmd => {
        Joseph.CallPluginCommand(cmd);
        console.log(cmd);
    });
}

Joseph.setPlan.emitGroupPlans = function(remainingSeconds) {
    let eventList = Joseph.timeLine.eventList;
    let commandList = [];
    for (var index = 0; index < eventList.length; index++) {
        if (Math.floor(eventList[index][0].time * Joseph.setPlan.totalDuration) === remainingSeconds) {
            eventList[index].forEach(event => {
                commandList.push(...Joseph.setPlan.createTempMove(event));
            });
        }

        if (Math.floor(eventList[index][0].time * Joseph.setPlan.totalDuration) < remainingSeconds) break;
    }
    commandList.forEach(cmd => {
        Joseph.CallPluginCommand(cmd);
        console.log(cmd);
    });
}

Joseph.setPlan.createTempMove = function(event) {
    let commandList = [];
    if (event && event.count === 2) {
        // console.log("双人任务");
        for (var i = 0; i < 2; i++) {
            Joseph.tempMove[event.npcList[i]] = {
                pairName: event.npcList[i === 0 ? 1 : 0],
                actionType: event.actionType,
                actionDetail: event.actionDetail,
                isMain: event.npcList[i] === event.main ? true : false,
                postBody: event.npcList[i] === event.main ? event.postBody : null,
                finishRoute: false
            };
            let command = Joseph.setPlan.createCommand(event.npcList[i], event.placeId, i === 0 ? event.targets[0] : event.targets[1])
            commandList.push(command);
        }

    } else if (event && event.count === 1) {
        // console.log("单人任务");
        Joseph.tempMove[event.npcList[0]] = {
            pairName: null,
            actionType: event.actionType,
            actionDetail: event.actionDetail,
            isMain: false,
            postBody: event.postBody,
            finishRoute: false
        }
        let command = Joseph.setPlan.createCommand(event.npcList[0], event.placeId, event.targets[0])
        // console.log("单人任务命令: ", command);
        commandList.push(command);
    }
    // console.log(commandList);
    return commandList;
}

Joseph.setPlan.createCommand = function(npcName, placeId, targetPix) {
    return `NPCMoveToPoint ${npcName} ${Joseph.getMapIdByNPCName(npcName)} ${placeId} ${targetPix[0]} ${targetPix[1]}`;
}

})();