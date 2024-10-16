/*:
 * @plugindesc 高级NPC移动控制器 - 支持复杂路线
 * @author YourName
 *
 * @help 这个插件提供了一个高级的NPC移动控制系统，支持复杂的移动路线。
 * 
 * 使用方法：
 * 1. 在事件中，使用插件命令：
 *    NPC_MOVE start eventId routeId
 *    例如：NPC_MOVE start 1 complex_route_1
 * 
 * 2. 停止NPC移动：
 *    NPC_MOVE stop eventId
 * 
 * 3. 重置NPC移动：
 *    NPC_MOVE reset eventId
 * 
 * 在插件中定义复杂路线，然后通过routeId引用。
 */

(function() {
    // 定义复杂路线
    const complexRoutes = {
        complex_route_1: [
            { code: 1 },  // 向下移动
            { code: 1 },
            { code: 3 },  // 向右移动
            { code: 3 },
            { code: 2 },  // 向左移动
            { code: 2 },
            { code: 4 },  // 向上移动
            { code: 4 },
        ],
        // 可以在这里添加更多复杂路线
    };

    class NPCMovementController {
        constructor(eventId, routeId) {
            this.eventId = eventId;
            this.route = complexRoutes[routeId] || [];
            this.isMoving = false;
        }

        start() {
            this.isMoving = true;
            this.applyRoute();
        }

        stop() {
            this.isMoving = false;
            const event = $gameMap.event(this.eventId);
            if (event) {
                event.clearForcedMove();
            }
        }

        applyRoute() {
            if (!this.isMoving || this.route.length === 0) {
                return;
            }

            const event = $gameMap.event(this.eventId);
            if (!event) {
                console.error(`Event with ID ${this.eventId} not found.`);
                return;
            }

            const moveRoute = {
                list: [...this.route, { code: 0 }],  // 添加结束命令
                repeat: false,
                skippable: false,
                wait: false
            };

            event.forceMoveRoute(moveRoute);
        }

        reset() {
            const event = $gameMap.event(this.eventId);
            if (event) {
                event.clearForcedMove();
                event.setPosition(event.event().x, event.event().y);  // 重置到初始位置
            }
            this.isMoving = false;
        }
    }

    const controllers = {};

    const pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        pluginCommand.call(this, command, args);
        if (command === 'NPC_MOVE') {
            const action = args[0].toLowerCase();
            const eventId = Number(args[1]);
            switch (action) {
                case 'start':
                    const routeId = args[2];
                    if (complexRoutes[routeId]) {
                        controllers[eventId] = new NPCMovementController(eventId, routeId);
                        controllers[eventId].start();
                    } else {
                        console.error(`Route ${routeId} not found.`);
                    }
                    break;
                case 'stop':
                    if (controllers[eventId]) {
                        controllers[eventId].stop();
                    }
                    break;
                case 'reset':
                    if (controllers[eventId]) {
                        controllers[eventId].reset();
                    }
                    break;
            }
        }
    };
})();