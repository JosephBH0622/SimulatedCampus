//-----------------------------------------------------------------------------
//  Display Name: Joseph's Core Script
//-----------------------------------------------------------------------------
//  For: RPG MAKER MV
//  Script Name: Joseph_Core.js
//  Version: 1.0
//-----------------------------------------------------------------------------
//  Latest Edition Date: 2024-09-02
//-----------------------------------------------------------------------------
//  Terms can be found at:
//  WeChat: 18813197112
//-----------------------------------------------------------------------------
var Imported = Imported || {};
Imported.Joseph_Core = true;

var Joseph = Joseph || {};
/*:
 * @plugindesc (v.1.0) Core functions for Joseph's plugins.

 * @author Joseph - WeChat: 18813197112
 *
 * @help
 * This plugin provides core functions for Joseph's other plugins.
 */

//-----------------------------------------------------------------------------
//  CODE STUFFS
//-----------------------------------------------------------------------------

(function () {
	Joseph.MAX_ITERATIONS = 10000000;
	Joseph.MAX_DAYS = 30; // 最大天数
	Joseph.AMAZON_URL = "http://13.56.82.62:7013/api/SimulatedCampus";
	Joseph.LOCAL_URL = "http://192.168.31.160:8088/api/SimulatedCampus";
	Joseph.ALIYUN_URL = "http://47.88.51.173:7013/api/SimulatedCampus"
	Joseph.worldTime;
    Joseph.worldIndex;
	Joseph.npcMovements = Joseph.npcMovements || {};
	Joseph.tempMove = Joseph.tempMove || {};
	Joseph.timeLine = Joseph.timeLine || {};
	Joseph.modifiedMapData = Joseph.modifiedMapData || {};

	Joseph.actionDict = {
		thinking: 9,
		sleeping: 10,
		dancing: 11,
		fighting: 12,
	};

	Joseph.realWorldNpcList = [
		"Zhangwei", "Wanglaowu", "Zhaogang", "Chenqiang", "Xuwenqiang", "Alex", "Jade", "Noah", "K", "Ali", "Alexander", "Raze", "Buddy", "Benny", "John", "James", "Tom", "Whitman", "Wes", "Jules"
	];

	Joseph.loveNpcList = [
		"Vincent", "Betty", "Tina", "Dean", "Zac", "Max"
	];

	Joseph.places = ["校园", "校医院", "宿舍", "医院外部", "医院"];

	Joseph.PlanProcess = class {
		/**
		 * planData是一个列表，列表中的每个元素都是一个事件，事件中包含的键值对如下面的例子所示：
		 * @key action_detail       : @type {string},
		 * @key type                : @type {string}, "talk / action", (action type)
		 * @key agents              : @type {string}, "Alex, Jade" / "Alex", (2 or 1 agent)
		 * @key place               : @type {string},
		 * @key plan_name           : @type {string},
		 * @key reason              : @type {string},
		 * @key talk_end_condition  : @type {string},
		 * @key talk_strategy       : @type {string},
		 * @key time                : @type {string}, "0-24h"
		 */

		constructor(worldTime, worldIndex, isGroup=false, isSorted=false, isCreated=false) {
			this._isCreated = isCreated;
			this.isSorted = isSorted;
			this._isGroup = isGroup;
			this._worldTime = worldTime;
            this._worldIndex = worldIndex;
			this._planData = undefined;

			if (this._isCreated) {
				// this.createPlanData();
				// this._planData = this.getPlanData(worldTime).body.plans;
				this.createPlanAndGetData();
			} else {
				this._planData = this.getPlanData().body.plans;
			}

			this._timeLine = [];
			this._nameList = [];
			this._NPCStateDict = {};

			if (!this._isGroup) {
				Joseph.timeLine.eventList = this.planDataToTimeLine();
				console.log(Joseph.timeLine.eventList);
				Joseph.timeLine.isGroup = false;
			} else {
				let tempData = this.planDataToTimeLine();
				Joseph.timeLine.eventList = this.groupTimeLineByTime(tempData);
				Joseph.timeLine.isGroup = true;
			}
		}

		getPlanData() {
			let xhr = new XMLHttpRequest();
			let url = Joseph.ALIYUN_URL + "/get_plan";
			xhr.open("POST", url, false); // false makes the request synchronous
			xhr.setRequestHeader("Content-Type", "application/json");

			try {
				xhr.send(JSON.stringify({ DEBUG: false, world_index: this._worldIndex, world_time: this._worldTime }));

				if (xhr.status !== 200) {
					throw new Error(`Post to plan data failed: ${xhr.status}`);
				}

				const data = JSON.parse(xhr.responseText);
				console.log("Response data:", data);
				return data;
			} catch (error) {
				console.error("Database Error:", error);
				throw error;
			}
		}

		createPlanData(callback) {
			let xhr = new XMLHttpRequest();
			let url = Joseph.ALIYUN_URL + "/create_plan"
			xhr.open("POST", url, false); // false makes the request synchronous
			xhr.setRequestHeader("Content-Type", "application/json");

			try {
				xhr.send(JSON.stringify({ DEBUG: false, world_time: this._worldTime, world_index: this._worldIndex }));

				if (xhr.status !== 200) {
					throw new Error(`Post to plan data failed: ${xhr.status}`);
				}

				const data = JSON.parse(xhr.responseText);
				console.log("Response data:", data);

				// Call getPlanData after createPlanData is completed
				// this._planData = this.getPlanData().body.plans;
				callback(data);

				// return data;
			} catch (error) {
				console.error("Database Error:", error);
				throw error;
			}
		}

		createPlanAndGetData() {
			this.createPlanData((data) => {
				this._planData = this.getPlanData().body.plans;
				console.log("Successfully get the created plan data!");
				console.log("Plan data detail: ", this._planData);
			});
		}

		getDataLength() {
			return this._planData.length;
		}

		sortPlanData() {
			return this._planData.sort((a, b) => a.time - b.time);
		}

		clearTimeLine() {
			if (Joseph.timeLine || Joseph.timeLine.length !== 0) {
				Joseph.timeLine = [];
			}
		}

		planDataToTimeLine() {
			if (this._planData === undefined) {
				console.log("Error: Plan data is empty.");
				return null;
			}
			if (!this.isSorted) {
				this._planData = this.sortPlanData();
			}

			this._planData.forEach((planInfo) => {
                // Get the plan's participater's name list.
				let agentList = planInfo.agents.split(",").map((item) => item.trim());

                // Get the number of agents.
                let count = agentList.length;

                // Plan's initiator.
				let mainActor = Joseph.stripSpace(planInfo.name);

                // Get the plan's occurring place ID.
				let place = planInfo.place;
				let targetMapId = Joseph.getMapIdByMapName(planInfo.place);

                // Get the participater's meeting pixels.
                // let pixelList = Joseph.getConsecPixels(targetMapId, count);

                // Get the meet pixels of two agents.
				let pixelPair = Joseph.getMeetPixels(targetMapId);

                // Get the plan's ID.
				let planId = planInfo.id;

                // Generate or Customize?
                let planFrom = planInfo.plan_from;

                // The plan's name.
				let planName = planInfo.plan_name;

                // Why the initiator set this plan.
				let reason = planInfo.reason;

				// Get plan's anction type (Action, Talk, other).
				let actionType = planInfo.type;

				// If action type is "action", get the action detail.
				let actionDetail = planInfo.action_detail;
				let talk_end_condition = planInfo.talk_end_condition;

				// 暂时只有双人聊天的情况。
				if (count === 2 && actionType === "talk" && agentList.includes(mainActor) && Joseph.places.includes(place)) {
					let nameA = Joseph.stripSpace(agentList[0]);
					let nameB = Joseph.stripSpace(agentList[1]);

					if (this._nameList.length === 0 || !this._nameList.includes(nameA)) {
						this._nameList.push(nameA);
						this._NPCStateDict[nameA] = [nameA + "和" + nameB + "在" + planInfo.place + ", " + planInfo.plan_name, ""];
					} else {
						this._NPCStateDict[nameA].unshift(nameA + "和" + nameB + "在" + planInfo.place + ", " + planInfo.plan_name);
					}

					if (this._nameList.length === 0 || !this._nameList.includes(nameB)) {
						this._nameList.push(nameB);
						this._NPCStateDict[nameB] = [nameB + "和" + nameA + "在" + planInfo.place + ", " + planInfo.plan_name, ""];
					} else {
						this._NPCStateDict[nameB].unshift(nameB + "和" + nameA + "在" + planInfo.place +", " + planInfo.plan_name);
					}

					var event = {
						time: 1 - (planInfo.time - 8) / 14,
						count: 2,
						npcList: [nameA, nameB],
						main: mainActor,
						placeId: targetMapId,
						targets: pixelPair,
						actionType: actionType,
						actionDetail: actionDetail,
						postBody: {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								name1: mainActor,
								name2: nameA === mainActor ? nameB : nameA,
								plan_name: planName,
								plan_id: planId,
								plan_from: planFrom,
								reason: reason,
								state1: nameA === mainActor ? this._NPCStateDict[nameA].pop() : this._NPCStateDict[nameB].pop(),
								state2: nameA !== mainActor ? this._NPCStateDict[nameA].pop() : this._NPCStateDict[nameB].pop(),
								world_index: this._worldIndex,
								world_time: this._worldTime,
								DEBUG: false
							}),
						},
					};

					this._timeLine.push(event);
				// 单人执行行动的情况。
				} else if (count === 1 && actionType === "action" && Joseph.places.includes(place)) {
					let name = Joseph.stripSpace(agentList[0]);

					if (this._nameList.length === 0 || !this._nameList.includes(name)) {
						this._nameList.push(name);
						this._NPCStateDict[name] = [name + "在" + planInfo.place + ", " + planInfo.plan_name, +""];
					} else {
						this._NPCStateDict[name].push(name + "在" + planInfo.place + ", " + planInfo.plan_name);
					}

					var event = {
						time: 1 - (planInfo.time - 8) / 14,
						count: 1,
						npcList: [name],
						main: mainActor,
						placeId: targetMapId,
						targets: pixelPair,
						actionType: actionType,
						actionDetail: actionDetail,
						postBody: {
							method: 'POST',
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								world_index: this._worldIndex,
								world_time: this._worldTime,
								DEBUG: false,
								plan_from: planFrom,
								plan_id: planId
							}),
						},
					};

					this._NPCStateDict[name].pop();
					this._timeLine.push(event);
				} else if (count > 1 && actionType === "action") {
                    // let npcList = [];
                    // agentList.forEach(agent => {
                    //     npcList.push(Joseph.stripSpace(agent));
                    // })

                    // let event = {
                    //     id: planId,
                    //     time: 1 - (planInfo.time - 8) / 14,
                    //     count: agentList.length,
                    //     npcList: npcList,
                    //     main: mainActor,
                    //     placeId: targetMapId,
					// 	targets: pixelList,
                    //     actionType: actionType,
                    //     actionDetail: actionDetail,
                    //     postBody: JSON.stringify({
                    //         plan_from: planFrom,
                    //         plan_id: planId,
                    //         world_index: this._worldIndex,
                    //         world_time: this._worldTime,
                    //     })
                    // }
					console.log("Filter bad plans.")
                } else {
					console.log("Unknown Situations.");
				}
			});

			return this._timeLine;
		}

		groupTimeLineByTime(tempData) {
			let groupedTimeLine = []; // 所有时间分组的列表
			let newGroup = []; // 按时间一致性分组
			let timePointer = -1; // 时间指示器，用于时间分组合适被推入

			tempData.forEach((event) => {
				if (event.time !== timePointer && timePointer !== -1) {
					groupedTimeLine.push(newGroup);
					newGroup = [event];
				} else {
					newGroup.push(event);
				}
				timePointer = event.time;
			});

			return groupedTimeLine;
		}
	};

	Joseph.TemporaryMap = class {
		constructor() {
			this._mapId = 0;
			this._tilesetId = 0;
			this._width = 0;
			this._height = 0;
			this._data = null;
		}

		setup(mapId) {
			var dataMap = Joseph.getMapData(mapId);
			this._mapId = mapId;
			this._tilesetId = dataMap.tilesetId;
			this._width = dataMap.width;
			this._height = dataMap.height;
			this._data = dataMap;
		}

		mapId() {
			return this._mapId;
		}

		isLoaded() {
			return !!this._data;
		}

		width() {
			return this._width;
		}

		height() {
			return this._height;
		}

		data() {
			return this._data;
		}

		isPassable(x, y, d) {
			const flags = this.tilesetFlags();
			const tiles = this.layeredTiles(x, y);
			const passageBit = (1 << (d / 2 - 1)) & 0x0f;
			for (let i = 0; i < tiles.length; i++) {
				const flag = flags[tiles[i]] || 0;
				// If the tile has no effect on passage, continue to the next tile
				if ((flag & 0x10) !== 0) continue;
				// If the tile is impassable, return false immediately
				if ((flag & 0x0f) === 0x0f) return false;
				// If the tile is not passable in the specified direction, return false
				if ((flag & passageBit) !== 0) return false;
			}
			// If we've checked all tiles and haven't returned false, it's passable
			return true;
		}

		tilesetFlags() {
			const tileset = $dataTilesets[this._tilesetId];
			if (tileset) {
				return tileset.flags;
			}
			return [];
		}

		layeredTiles(x, y) {
			const width = this._width;
			const height = this._height;
			const layers = [];
			for (let z = 3; z >= 0; z--) {
				// Start from top layer
				const tileId =
					this._data.data[(z * height + y) * width + x] || 0;
				if (tileId > 0) {
					layers.push(tileId);
				}
			}
			return layers;
		}
	};

    Joseph.initWorld = function () {
		const xhr = new XMLHttpRequest();
        const url = Joseph.ALIYUN_URL + "/init_world";

        xhr.open("GET", url, false); // false表示同步请求
        xhr.setRequestHeader("Content-Type", "application/json");

        try {
            xhr.send();
            if (xhr.status >= 200 && xhr.status < 300) {
                const initData = JSON.parse(xhr.responseText);
				console.log("Response data:", initData);
				return initData;
            } else {
                throw new Error(`HTTP error! status: ${xhr.status}`);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

	Joseph.actionLog = function (postBody) {
		let url = Joseph.ALIYUN_URL + "/update/actions";
		fetch(url, postBody
		).then((response) => {
			if (!response.ok) {
				console.error("Post to Database failed:", response.status);
			}
		}).catch((error) => {
			console.error("Database Error:", error);
		});
	}

	Joseph.startChat = function (postBody) {
		let url = Joseph.ALIYUN_URL + "/mulitchat"
		fetch(url, postBody
		).then((response) => {
			if (!response.ok) {
				console.error("Post to Database failed:", response.status);
			}
		}).catch((error) => {
			console.error("Database Error:", error);
		});
	};

	Joseph.CallPluginCommand = function (line) {
		var args = line.split(" ");
		var command = args.shift();
		var interpreter = new Game_Interpreter();
		interpreter._params = [line];
		interpreter.pluginCommand(command, args);
	};

	Joseph.getMapData = function (mapId) {
		if (Joseph.modifiedMapData[mapId]) {
			return Joseph.modifiedMapData[mapId];
		}

		var filename = "Map%1.json".format(mapId.padZero(3));
		var mapData = null;

		var xhr = new XMLHttpRequest();
		var url = "data/" + filename;
		xhr.open("GET", url, false);
		xhr.overrideMimeType("application/json");
		xhr.onload = function () {
			if (xhr.status >= 200 && xhr.status < 300) {
				mapData = JSON.parse(xhr.responseText);
			}
		};
		xhr.onerror = function () {
			throw new Error("无法加载地图数据: " + mapId);
		};
		xhr.send();
		return mapData;
	};

	Joseph.getMapDataAndTempMap = function (mapId) {
		var mapData = Joseph.getMapData(mapId);
		var tempMap = new Joseph.TemporaryMap();
		tempMap.setup(mapId);
		return { mapData: mapData, tempMap: tempMap };
	};

	Joseph.saveMapData = function (mapId, data) {
		Joseph.modifiedMapData[mapId] = data;
	};

	Joseph.getEventIdByName = function (mapId, eventName) {
		var mapInfo = Joseph.getMapDataAndTempMap(mapId);
		for (var i = 1; i < mapInfo.mapData.events.length; i++) {
			var event = mapInfo.mapData.events[i];
			if (event && event.name === eventName) {
				return event.id;
			}
		}
		console.error("在地图上找不到名字为 " + eventName + " 的事件");
		return null;
	};

	Joseph.getMapIdByNPCName = function (npcName) {
		for (let mapId = 1; mapId < $dataMapInfos.length; mapId++) {
			let mapData = Joseph.getMapData(mapId);

			if (mapData && mapData.events) {
				for (let event of mapData.events) {
					if (event && event.name === npcName) {
						return mapId;
					}
				}
			}
		}
		return null;
	};

	Joseph.getMapIdByMapName = function (mapName) {
		if (!$dataMapInfos) {
			console.error("$dataMapInfos is not loaded yet. Make sure to call this function after the game data is fully loaded.");
			return null;
		}

		for (let i = 1; i < $dataMapInfos.length; i++) {
			let mapInfo = $dataMapInfos[i];
			if (mapInfo && mapInfo.name === mapName) {
				return i;
			}
		}

		console.warn(`No map found with the name "${mapName}"`);
		return null;
	};

	Joseph.isWalkable = function (tempMap, cordx, cordy) {
		return tempMap.isPassable(cordx, cordy, 2) && tempMap.isPassable(cordx, cordy, 4) && tempMap.isPassable(cordx, cordy, 6) && tempMap.isPassable(cordx, cordy, 8);
	};

	Joseph.mergeUniqueArrays = function (arr1, arr2) {
		const uniqueSet = new Set([...arr1, ...arr2]);
		return Array.from(uniqueSet);
	};

	Joseph.areArraysEqual = function (arr1, arr2) {
		if (arr1.length !== arr2.length) {
			return false;
		}

		const countMap = new Map();

		for (const item of arr1) {
			countMap.set(item, (countMap.get(item) || 0) + 1);
		}

		for (const item of arr2) {
			if (!countMap.has(item)) {
				return false;
			}
			countMap.set(item, countMap.get(item) - 1);
			if (countMap.get(item) === 0) {
				countMap.delete(item);
			}
		}

		return countMap.size === 0;
	};

	Joseph.transferNPC = function (sourceMapId, eventName, targetMapId, x, y) {
		var eventId = Joseph.getEventIdByName(sourceMapId, eventName);
		if (eventId === null) {
			console.error("无法找到指定名字的事件，无法转移");
			return;
		}

		var sourceMap = Joseph.getMapData(sourceMapId);
		var targetMap = Joseph.getMapData(targetMapId);

		var eventData = sourceMap.events.find((event) => event && event.id === eventId);
		if (!eventData) {
			console.error("在源地图上找不到指定的事件");
			return;
		}

		// 从源地图移除事件
		sourceMap.events.splice(eventId, 1, null);

		// 在目标地图创建新事件
		var newEventId = (targetMap.events.length > 0 ? Math.max(...targetMap.events.filter((e) => e).map((e) => e.id)) : 0) + 1;
		var newEventData = {
			id: newEventId,
			name: eventData.name,
			note: eventData.note,
			pages: eventData.pages,
			x: x,
			y: y,
		};
		targetMap.events[newEventId] = newEventData;
		Joseph.npcMovements[eventName].targetEventId = newEventId;

		// 更新 Joseph.modifiedMapData
		Joseph.modifiedMapData[sourceMapId] = sourceMap;
		Joseph.modifiedMapData[targetMapId] = targetMap;

		console.log(`成功将事件从地图 ${sourceMapId} 转移到地图 ${targetMapId}`);
		return newEventId;
	};

	Joseph.aStar = function (start, goal, mapInfo) {
		var openSet = [start];
		var closedSet = new Set();
		var cameFrom = {};
		var gScore = {};
		var fScore = {};
		gScore[start.x + "," + start.y] = 0;
		fScore[start.x + "," + start.y] = heuristic(start, goal);

		function heuristic(a, b) {
			return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
		}

		var iterations = 0;
		while (openSet.length > 0 && iterations < Joseph.MAX_ITERATIONS) {
			iterations++;
			var current = openSet.reduce((a, b) => fScore[a.x + "," + a.y] < fScore[b.x + "," + b.y] ? a : b);

			if (current.x === goal.x && current.y === goal.y) {
				return Joseph.reconstructPath(cameFrom, current);
			}

			openSet = openSet.filter((node) => node !== current);
			closedSet.add(current.x + "," + current.y);

			var neighbors = [
				{ x: current.x + 1, y: current.y },
				{ x: current.x - 1, y: current.y },
				{ x: current.x, y: current.y + 1 },
				{ x: current.x, y: current.y - 1 },
			];

			for (var neighbor of neighbors) {
				if (neighbor.x < 0 || neighbor.y < 0 || neighbor.x >= mapInfo.tempMap.width() || neighbor.y >= mapInfo.tempMap.height() || !Joseph.isWalkable(mapInfo.tempMap, neighbor.x, neighbor.y) || closedSet.has(neighbor.x + "," + neighbor.y)) {
					continue;
				} // 在这种情况下，只要isPassable在任何一个方向上可以通行，那么就认为该处可以通行。

				var tentativeGScore = gScore[current.x + "," + current.y] + 1;

				if (!gScore[neighbor.x + "," + neighbor.y] || tentativeGScore < gScore[neighbor.x + "," + neighbor.y]) {
					cameFrom[neighbor.x + "," + neighbor.y] = current;
					gScore[neighbor.x + "," + neighbor.y] = tentativeGScore;
					fScore[neighbor.x + "," + neighbor.y] = gScore[neighbor.x + "," + neighbor.y] + heuristic(neighbor, goal);

					if (!openSet.some((node) => node.x === neighbor.x && node.y === neighbor.y)) {
						openSet.push(neighbor);
					}
				}
			}
		}

		console.log("寻路达到最大迭代次数");
		return null; // 没有找到路径或达到最大迭代次数
	};

	Joseph.reconstructPath = function (cameFrom, current) {
		var path = [current];
		while (cameFrom[current.x + "," + current.y]) {
			current = cameFrom[current.x + "," + current.y];
			path.unshift(current);
		}
		return path;
	};

	Joseph.setRoute = function (path) {
		var route = {
			list: [],
			repeat: false,
			skippable: false,
			wait: false,
		};

		for (var i = 1; i < path.length; i++) {
			var dx = path[i].x - path[i - 1].x;
			var dy = path[i].y - path[i - 1].y;
			// var direction = 0;
			if (dx > 0) route.list.push({ code: 3 }); // direction = 6
			else if (dx < 0) route.list.push({ code: 2 }); // direction = 4;
			else if (dy > 0) route.list.push({ code: 1 }); // direction = 2;
			else if (dy < 0) route.list.push({ code: 4 }); // direction = 8;
		}

		route.list.push({ code: 0 }); // 结束移动路线
		return route;
	};

	Joseph.getMeetPixels = function (mapId) {
		var mapInfo = Joseph.getMapDataAndTempMap(mapId);
		var tempMap = mapInfo.tempMap;

		if (!mapInfo) {
			console.error("无法加载地图数据");
			return false;
		}

		var dimx = tempMap.width();
		var dimy = tempMap.height();

		while (true) {
			let x = Math.floor(Math.random() * dimx);
			let y = Math.floor(Math.random() * dimy);
			if (Joseph.isWalkable(tempMap, x, y) && Joseph.isWalkable(tempMap, x + 1, y)) {
				return [[x, y], [x + 1, y]];
			} else if (Joseph.isWalkable(tempMap, x, y) && Joseph.isWalkable(tempMap, x - 1, y)) {
				return [[x, y], [x - 1, y]];
			} else if (Joseph.isWalkable(tempMap, x, y) && Joseph.isWalkable(tempMap, x, y + 1)) {
				return [[x, y], [x, y + 1]];
			} else if (Joseph.isWalkable(tempMap, x, y) && Joseph.isWalkable(tempMap, x, y - 1)) {
				return [[x, y], [x, y - 1]];
			}
		}
	};

	Joseph.getConsecPixels = function (mapId, N) {
		var mapInfo = Joseph.getMapDataAndTempMap(mapId);
		var tempMap = mapInfo.tempMap;

		if (!mapInfo) {
			console.error("无法加载地图数据");
			return false;
		}

		var dimx = tempMap.width();
		var dimy = tempMap.height();

		while (true) {
			let x = Math.floor(Math.random() * dimx);
			let y = Math.floor(Math.random() * dimy);

			if (Joseph.isWalkable(tempMap, x, y)) {
				let consecutivePoints = [[x, y]];

				for (let i = 1; i < N; i++) {
					if (Joseph.isWalkable(tempMap, x + 1, y) && !consecutivePoints.includes([x + 1, y])) {
						consecutivePoints.push([x + 1, y]);
						x = x + 1;
					} else if (Joseph.isWalkable(tempMap, x - 1, y) && !consecutivePoints.includes([x - 1, y])) {
						consecutivePoints.push([x - 1, y]);
						x = x - 1 ;
					} else if (Joseph.isWalkable(tempMap, x, y + 1) && !consecutivePoints.includes([x, y + 1])) {
						consecutivePoints.push([x, y + 1]);
						y = y + 1;
					} else if (Joseph.isWalkable(tempMap, x, y - 1) && !consecutivePoints.includes([x, y - 1])) {
						consecutivePoints.push([x, y - 1]);
						y = y - 1;
					} else {
						break;
					}
				}

				if (consecutivePoints.length === N) {
					return consecutivePoints;
				}
			}
		}
	}

	Joseph.getAllWalkableEdgePixels = function (mapId) {
		var mapInfo = Joseph.getMapDataAndTempMap(mapId);
		var walkablePixels = [];
		if (!mapInfo) {
			console.error("无法加载地图数据");
			return null;
		}

		var tempMap = mapInfo.tempMap;
		var dimx = tempMap.width();
		var dimy = tempMap.height();
		var cornerPixels = [
			[0, 0],
			[0, dimy - 1],
			[dimx - 1, 0],
			[dimx - 1, dimy - 1],
		];

		for (var pix of cornerPixels) {
			if (Joseph.isWalkable(tempMap, pix[0], pix[1])) {
				walkablePixels.push({ x: pix[0], y: pix[1] });
			}
		}

		for (var i = 1; i < dimx - 1; i++) {
			if (Joseph.isWalkable(tempMap, i, 0)) {
				walkablePixels.push({ x: i, y: 0 });
			}

			if (Joseph.isWalkable(tempMap, i, dimy - 1)) {
				walkablePixels.push({ x: i, y: dimy - 1 });
			}
		}

		for (var j = 1; j < dimy - 1; j++) {
			if (Joseph.isWalkable(tempMap, 0, j)) {
				walkablePixels.push({ x: 0, y: j });
			}

			if (Joseph.isWalkable(tempMap, dimx - 1, j)) {
				walkablePixels.push({ x: dimx - 1, y: j });
			}
		}

		return walkablePixels;
	};

	Joseph.truePassablePixels = function (start, pixelList, mapInfo) {
		var tailoredList = [];
		var tailoredPath = [];
		for (var pix of pixelList) {
			var path = Joseph.aStar(start, pix, mapInfo);
			if (!!path) {
				tailoredList.push(pix);
				tailoredPath.push(path);
			}
		}
		return [tailoredList, tailoredPath];
	};

	Joseph.pickRandomPath = function (tailoredList, tailoredPath) {
		if (!Array.isArray(tailoredList) || !Array.isArray(tailoredPath)) {
			console.error(
				"Invalid arguments: tailoredList and tailoredPath must be arrays"
			);
			return null;
		}
		var length = tailoredList.length;
		var index = Math.floor(Math.random() * length);
		var pix = tailoredList[index];
		var path = tailoredPath[index];
		return [pix, path];
	};

	Joseph.npcMoveOnSwitch = function () {
		for (var i = 0; i < $dataMap.events.length; i++) {
			// var npcName = $dataMap.events[i].name;
			if ($dataMap.events[i] && Joseph.npcMovements[$dataMap.events[i].name]) {
				var route = Joseph.setRoute(
					Joseph.npcMovements[$dataMap.events[i].name].path
				);
				$gameMap.event(i).forceMoveRoute(route);
			}
		}
	};

	Joseph.stripSpace = function (npcName) {
		let noSpaces = npcName.replace(/\s/g, "");
		let lowercase = noSpaces.toLowerCase();
		let sentences = lowercase.split(".");
		let processedSentences = sentences.map((sentence, index) => {
			if (sentence.length > 0) {
				return sentence.charAt(0).toUpperCase() + sentence.slice(1);
			}
			return sentence;
		});

		// 重新组合句子，保留句点
		return processedSentences.join(".");
	};

	Joseph.printWalkablePix = function (mapId) {
		let map = Joseph.getMapDataAndTempMap(mapId);
		for (j = 0; j < map.tempMap.height(); j++) {
			let outputline = "";
			for (i = 0; i < map.tempMap.width(); i++) {
				// let pixel = [i, j];
				let isWalkable = Joseph.isWalkable(map.tempMap, i, j);
				if (isWalkable) {
					outputline += "1  ";
				} else {
					outputline += "0  ";
				}
				if (i === map.tempMap.width() - 1 && j < 10) {
					console.log(`line ${j}:\t\t` + outputline);
				} else if (i === map.tempMap.width() - 1 && j >= 10) {
					console.log(`line ${j}:\t` + outputline);
				}
			}
		}
	}

	Joseph.Game_Event_start = Game_Event.prototype.start;
    Game_Event.prototype.start = function() {
        Joseph.Game_Event_start.call(this);
        this.updateEventInfo();
    };

    Game_Event.prototype.updateEventInfo = function() {
        var eventId = this.eventId();
        var name = this.event().name;

        $gameVariables.setValue(4, eventId);
        $gameVariables.setValue(5, name);
        // var friendliness = this.getFriendliness($gameVariables.values(4));
        console.log('Event triggered - ID: ' + eventId + ', Name: ' + name);
    };
})();