//-----------------------------------------------------------------------------
//  Display Name: Joseph's Moving NPC Script
//-----------------------------------------------------------------------------
//  For: RPG MAKER MV
//  Script Name: Joseph_MoveNPCs.js
//  Version: 2.0
//-----------------------------------------------------------------------------
//  Latest Edition Date: 2024-09-02
//-----------------------------------------------------------------------------
//  Terms can be found at:
//  WeChat: 18813197112
//-----------------------------------------------------------------------------
var Imported = Imported || {};
Imported.Joseph_MoveNPC = true;

var Joseph = Joseph || {};
Joseph.EvBase = Joseph.EvBase || {};
Joseph.EvHub = Joseph.EvHub || {};
Joseph.setPlan = Joseph.setPlan || {};
Joseph.Move = Joseph.Move || {};

//-----------------------------------------------------------------------------
/*:
 * @plugindesc (v.2.0) Make NPCs move to specified coordinates (allowing cross-map movement and background updates)
 *
 * @author Joseph - WeChat: 18813197112
 *
 * @help
 * This plugin creates a new plugin command that allows specified NPCs to move to specific coordinates,
 * supporting cross-map movement and background updates.
 *
 * Usage:
 * Use plugin command 'NPCMoveToPoint' to activate the script.
 *
 *      Usage Format & Parameters: NPCMoveToPoint <NPCName (str)> <StartMapID (int)> <TargetMapID (int)> <x-Coordinate (int)> <y-Coordinate (int)>
 *          <NPCName (str)>: A string which represents the NPC that you want to move.
 *          <StartMapID (int)>: The map ID where the NPC is located when the movement begins.
 *          <TargetMapID (int)>: The map ID where the NPC will finally arrive in.
 *          <x-Coordinate (int)>: The x-cord of the target pixel.
 *          <y-Coordinate (int)>: The y-Cord of the target pixel.
 *
 *      Example: NPCMoveToPoint zhangwei 1 6 5 5
 */

//-----------------------------------------------------------------------------
//  CODE STUFFS
//-----------------------------------------------------------------------------

(function () {
Joseph.Move.globalUpdateInterval = Number(PluginManager.parameters("Joseph_MoveNPC")["globalUpdateInterval"]) || 300;
Joseph.Move.updateTimer;
Joseph.Move.isPaused = false;

Joseph.Move.startGlobalUpdate = function() {
    // 使用setInterval代替setTimeout
    Joseph.Move.updateTimer = setInterval(function() {
        if (!Joseph.Move.isPaused) {
            Joseph.Move.globalUpdate();
        }
    }, Joseph.Move.globalUpdateInterval);
};

Joseph.Move.pauseGlobalUpdate = function() {
    Joseph.Move.isPaused = true;
    console.log("Move is paused!");
};

Joseph.Move.resumeGlobalUpdate = function() {
    Joseph.Move.isPaused = false;
    console.log("Move is resumed!");
};

Joseph.Move.stopGlobalUpdate = function() {
    clearInterval(Joseph.Move.updateTimer);
};

// 全局更新函数
Joseph.Move.globalUpdate = function () {
    for (var npcName in Joseph.npcMovements) {
        var oldMembers = [];
        var newMembers = [];

        Joseph.getMapData($gameMap.mapId()).events.forEach((event) => {
            if (event !== null) { oldMembers.push(event.name); }
        });
        // console.log("oldMembers: ", oldMembers);

        // 更新背景地图
        Joseph.Move.updateNPCPosition(npcName);

        Joseph.getMapData($gameMap.mapId()).events.forEach((event) => {
            if (event !== null) { newMembers.push(event.name); }
        });
        // console.log("newMembers: ", newMembers);

        if (!Joseph.areArraysEqual(oldMembers, newMembers)) {
            var unionMembers = Joseph.mergeUniqueArrays(oldMembers, newMembers);
            unionMembers.forEach((member) => {
                if (oldMembers.some((item) => item === member) && !newMembers.some((item) => item === member)) {
                    var event = $dataMap.events.find(event => event && event.name === member);
                    if (event) {
                        console.log("Removing event:", event);
                        $gameMap.eraseEvent(event.id);
                        $dataMap.events[event.id] = null;
                        $gameMap._events[event.id] = null;
                    } else {
                        // var event_m = Joseph.modifiedMapData[$gameMap.mapId()].events.find(event => event && event.name === member);
                        // $gameMap.eraseEvent(event_m.id);
                        // $gameMap._events[event_m.id] = null;
                        console.warn(`No event found with name: ${member}`);
                    }

                } else if (!oldMembers.some((item) => item === member) && newMembers.some((item) => item === member)) {
                    Joseph.modifiedMapData[$gameMap.mapId()].events.some(
                        (event) => {
                            if (event !== null && event.name === member) {
                                var newEventData = {
                                    id: event.id,
                                    name: event.name,
                                    note: event.note,
                                    pages: event.pages,
                                    x: event.x,
                                    y: event.y,
                                };
                                $dataMap.events[event.id] = newEventData;
                                var newEvent = new Game_Event($gameMap._mapId, event.id);
                                $gameMap._events[event.id] = newEvent;
                                var newSprite = new Sprite_Character(newEvent);
                                SceneManager._scene._spriteset._characterSprites.push(newSprite);
                                SceneManager._scene._spriteset._tilemap.addChild(newSprite);
                                var path = JSON.parse(JSON.stringify(Joseph.npcMovements[member].path));
                                var route = Joseph.setRoute(path);
                                $gameMap.event(event.id).forceMoveRoute(route);
                                return;
                            }
                        }
                    );
                }
            });
        }
    }
    // 确保按照时间间隔 globalUpdateInterval 进行地图更新
    // setTimeout(Joseph.Move.globalUpdate, Joseph.Move.globalUpdateInterval);
}

// 更新NPC位置
Joseph.Move.updateNPCPosition = function(npcName) {
    // var movement = Joseph.npcMovements[npcName];
    if (!Joseph.npcMovements[npcName]) return;

    if (Joseph.npcMovements[npcName].path.length !== 0) {
        var nextStep = Joseph.npcMovements[npcName].path.shift();
        Joseph.npcMovements[npcName].currentX = nextStep.x;
        Joseph.npcMovements[npcName].currentY = nextStep.y;

        // 更新 Joseph.modifiedMapData
        var mapData = Joseph.getMapData(Joseph.npcMovements[npcName].currentMapId);

        for (var i = 0; i < mapData.events.length; i++) {
            var event = mapData.events[i];
            if (event !== null && event.name === npcName) {
                mapData.events[i].x = Joseph.npcMovements[npcName].currentX;
                mapData.events[i].y = Joseph.npcMovements[npcName].currentY;
                break;
            }
        }

        Joseph.saveMapData(Joseph.npcMovements[npcName].currentMapId, mapData);
    }

    if (Joseph.npcMovements[npcName].path.length === 0) {
        if (Joseph.npcMovements[npcName].currentMapId !== Joseph.npcMovements[npcName].targetMapId) {
            // 在该 NPC 的 path 长度为 0 时，如果 NPC 还没到目标地图，进行地图转移
            Joseph.transferNPC(Joseph.npcMovements[npcName].currentMapId, npcName, Joseph.npcMovements[npcName].targetMapId, Joseph.npcMovements[npcName].targetEdgeX, Joseph.npcMovements[npcName].targetEdgeY);
            Joseph.npcMovements[npcName].currentMapId = Joseph.npcMovements[npcName].targetMapId;
            Joseph.npcMovements[npcName].currentX = Joseph.npcMovements[npcName].targetEdgeX;
            Joseph.npcMovements[npcName].currentY = Joseph.npcMovements[npcName].targetEdgeY;
            // 计算新的路径到最终目标
            Joseph.npcMovements[npcName].path = Joseph.npcMovements[npcName].pathTotarget;
            return;
        } else {
            Joseph.npcMovements[npcName].finishRoute = true;
            if (Joseph.npcMovements[npcName].pairName === null) {
                console.log(npcName + " 已到达目标位置");
                if (Joseph.npcMovements[npcName].actionType === "action" && Joseph.npcMovements[npcName].currentMapId === $gameMap.mapId()) {
                    $gameMap.event(Joseph.npcMovements[npcName].targetEventId).requestBalloon(Joseph.actionDict[Joseph.npcMovements[npcName].actionDetail]);
                }
                Joseph.actionLog(Joseph.npcMovements[npcName].postBody);
                delete Joseph.npcMovements[npcName];
                return;
            } else if (Joseph.npcMovements[npcName].pairName) {
                if (Joseph.npcMovements[Joseph.npcMovements[npcName].pairName].finishRoute && Joseph.npcMovements[npcName].isMain) {
                    var finalPostBody = Joseph.npcMovements[npcName].postBody;
                    console.log(npcName + " and " + Joseph.npcMovements[npcName].pairName + " 已到达目标位置");

                    if (Joseph.npcMovements[npcName].actionType === "talk" && Joseph.npcMovements[npcName].currentMapId === $gameMap.mapId()) {
                        $gameMap.event(Joseph.npcMovements[npcName].targetEventId).requestBalloon(8); // Talk Balloon.
                        $gameMap.event(Joseph.npcMovements[Joseph.npcMovements[npcName].pairName].targetEventId).requestBalloon(8);
                    }

                    delete Joseph.npcMovements[Joseph.npcMovements[npcName].pairName];
                    delete Joseph.npcMovements[npcName];
                    Joseph.startChat(finalPostBody);
                    // SceneManager._scene._customTextWindow.refresh();
                    return;
                }
            } else {
                return;
            }
        }
    }
}

// setTimeout(Joseph.Move.globalUpdate, Joseph.Move.globalUpdateInterval);

Joseph.Move.moveNPCToPoint = function(npcName, startMapId, targetMapId, targetX, targetY) {
    var startMapInfo = Joseph.getMapDataAndTempMap(startMapId);
    var targetMapInfo = Joseph.getMapDataAndTempMap(targetMapId);

    if (startMapInfo && targetMapInfo) {
        var event = startMapInfo.mapData.events.find((event) => event && event.name === npcName);

        if (event) {
            if (startMapId !== targetMapId) {
                // 跨地图移动
                var sourceEdges = Joseph.getAllWalkableEdgePixels(startMapId);
                var trueSourceEdgesAndPaths = Joseph.truePassablePixels({ x: event.x, y: event.y }, sourceEdges, startMapInfo);
                var sourceEdgeAndPath = Joseph.pickRandomPath(trueSourceEdgesAndPaths[0], trueSourceEdgesAndPaths[1]);
                var sourcePathtoEdge = sourceEdgeAndPath[1];

                if (startMapId === $gameMap.mapId()) {
                    var routeToEdge = Joseph.setRoute(sourcePathtoEdge);
                    $gameMap.event(event.id).forceMoveRoute(routeToEdge);
                }

                var targetEdges = Joseph.getAllWalkableEdgePixels(targetMapId);
                var trueTargetEdgesAndPaths = Joseph.truePassablePixels({ x: targetX, y: targetY }, targetEdges, targetMapInfo);
                var targetEdgeAndPath = Joseph.pickRandomPath(trueTargetEdgesAndPaths[0], trueTargetEdgesAndPaths[1]);
                var targetEdge = targetEdgeAndPath[0];
                var targetPathtoEdge = targetEdgeAndPath[1];
                Joseph.Move.initMoveMent(npcName, startMapId, targetMapId, targetX, targetY, event.x, event.y, sourcePathtoEdge, targetEdge.x, targetEdge.y, event.id, targetPathtoEdge.reverse());
            } else {
                // 同地图移动
                var path = Joseph.aStar({ x: event.x, y: event.y }, { x: targetX, y: targetY }, startMapInfo);
                Joseph.Move.initMoveMent(npcName, startMapId, targetMapId, targetX, targetY, event.x, event.y, path, null, null, event.id, null);

                if (startMapId === $gameMap.mapId()) {
                    var routeToEdge = Joseph.setRoute(path);
                    $gameMap.event(event.id).forceMoveRoute(routeToEdge);
                }
            }
        } else {
            console.log("未找到名为 " + npcName + " 的NPC");
        }
    } else {
        console.log("无法获取地图数据");
    }
}

Joseph.Move.initMoveMent = function(npcName, startMapId, targetMapId, targetX, targetY, currentX, currentY, path, targetEdgeX, targetEdgeY, targetEventId, pathTotarget) {
    Joseph.npcMovements[npcName] = {
        npcName: npcName,
        currentMapId: startMapId,
        targetMapId: targetMapId,
        targetX: targetX,
        targetY: targetY,
        currentX: currentX,
        currentY: currentY,
        path: path,
        targetEdgeX: targetEdgeX,
        targetEdgeY: targetEdgeY,
        targetEventId: targetEventId,
        pathTotarget: pathTotarget,
        actionType: null,
        actionDetail: null,
        pairName: null,
        isMain: false,
        postBody: null,
        finishRoute: false,
    };

    if (!!Joseph.tempMove[npcName]) {
        Joseph.npcMovements[npcName].pairName = Joseph.tempMove[npcName].pairName;
        Joseph.npcMovements[npcName].actionType = Joseph.tempMove[npcName].actionType;
        Joseph.npcMovements[npcName].actionDetail = Joseph.tempMove[npcName].actionDetail;
        Joseph.npcMovements[npcName].isMain = Joseph.tempMove[npcName].isMain;
        Joseph.npcMovements[npcName].postBody = Joseph.tempMove[npcName].postBody;
        Joseph.npcMovements[npcName].finishRoute = Joseph.tempMove[npcName].finishRoute;
    }

    delete Joseph.tempMove[npcName];
}

Joseph.Move.reinitializeNPCPositions = function() {
    for (var npcName in Joseph.npcMovements) {
        var movement = Joseph.npcMovements[npcName];
        var event = $dataMap.events.find(e => e && e.name === npcName);
        if (event) {
            event.x = movement.currentX;
            event.y = movement.currentY;
        }
    }
}

Joseph.Move.Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function (command, args) {
    Joseph.Move.Game_Interpreter_pluginCommand.call(this, command, args);
    if (command === "NPCMoveToPoint") {
        var npcName = args[0];
        var startMapId = parseInt(args[1]);
        var targetMapId = parseInt(args[2]);
        var targetX = parseInt(args[3]);
        var targetY = parseInt(args[4]);
        Joseph.Move.moveNPCToPoint(npcName, startMapId, targetMapId, targetX, targetY);
    }
};

// 当玩家进入地图时更新 NPC 位置
// 只要在插件脚本中修改了系统的内置类，并且该插件处于 “on” 状态，那么这些更改将默认在每个地图上生效，而不需要显式调用 plugin_command
// 重写地图加载函数以使用修改后的数据
Joseph.Move.DataManager_loadMapData = DataManager.loadMapData;
DataManager.loadMapData = function (mapId) {
    if (Joseph.modifiedMapData[mapId]) {
        $dataMap = JSON.parse(JSON.stringify(Joseph.modifiedMapData[mapId]));
        // this.onLoad($dataMap);
    } else {
        Joseph.Move.DataManager_loadMapData.call(this, mapId);
    }
};

Joseph.Move.Scene_Map_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function () {
    Joseph.Move.Scene_Map_start.call(this);
    // if (Joseph.modifiedMapData[$gameMap.mapId()]) {
    //     $dataMap = Joseph.modifiedMapData[$gameMap.mapId()];
    // }
    // Joseph.Move.reinitializeNPCPositions();
    Joseph.npcMoveOnSwitch();
};

Joseph.Move.startGlobalUpdate();

})();
