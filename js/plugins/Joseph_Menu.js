var Imported = Imported || {};
Imported.Joseph_Menu = true;

var Joseph = Joseph || {};
Joseph.Menu = Joseph.Menu || {};

(function() {

Joseph.Menu.gameTasksystem = null;

function Game_TaskSystem() {
    this.initialize.apply(this, arguments);
}

Game_TaskSystem.prototype.initialize = function() {
    this._tasks = [];
};

Game_TaskSystem.prototype.addTask = function(title, description, completed) {
    this._tasks.push({
        title: title,
        description: description,
        completed: completed
    });
};

Game_TaskSystem.prototype.getTasks = function() {
    return this._tasks;
};

Joseph.Menu.gameTasksystem = new Game_TaskSystem();

Scene_Menu.prototype.createCommandWindow = function() {
    this._commandWindow = new Window_MenuCommand(0, 0);
    this._commandWindow.setHandler('item',      this.commandItem.bind(this));
    this._commandWindow.setHandler('skill',     this.commandPersonal.bind(this));
    this._commandWindow.setHandler('equip',     this.commandPersonal.bind(this));
    this._commandWindow.setHandler('status',    this.commandPersonal.bind(this));
    this._commandWindow.setHandler('formation', this.commandFormation.bind(this));
    this._commandWindow.setHandler('options',   this.commandOptions.bind(this));
    this._commandWindow.setHandler('save',      this.commandSave.bind(this));
    this._commandWindow.setHandler('gameEnd',   this.commandGameEnd.bind(this));
    // Add custom handler
    this._commandWindow.setHandler('task',      this.commandTask.bind(this));
    this._commandWindow.setHandler('log',      this.commandLog.bind(this));
    this._commandWindow.setHandler('cancel',    this.popScene.bind(this));
    this.addWindow(this._commandWindow);
};

// Add custom command handler
Scene_Menu.prototype.commandTask = function() {
    // console.log('Custom command executed!');
    SceneManager.push(Scene_Tasks);
    // Your custom logic here
    // For example: SceneManager.push(Scene_Custom);
};

Scene_Menu.prototype.commandLog = function() {
    SceneManager.push(Scene_Logs);
}

function Scene_Tasks() {
    this.initialize.apply(this, arguments);
}

Scene_Tasks.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Tasks.prototype.constructor = Scene_Tasks;

Scene_Tasks.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Tasks.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createTasksWindow();
};

Scene_Tasks.prototype.createTasksWindow = function() {
    this._tasksWindow = new Window_TaskList(0, 0, Graphics.boxWidth, Graphics.boxHeight);
    this._tasksWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._tasksWindow);
};

function Window_TaskList() {
    this.initialize.apply(this, arguments);
}

Window_TaskList.prototype = Object.create(Window_Selectable.prototype);
Window_TaskList.prototype.constructor = Window_TaskList;

Window_TaskList.prototype.initialize = function(x, y, width, height) {
    Window_Selectable.prototype.initialize.call(this, x, y, width, height);
    this.refresh();
    this.activate();
};

Window_TaskList.prototype.maxItems = function() {
    return Joseph.Menu.gameTasksystem.getTasks().length;
};

Window_TaskList.prototype.drawItem = function(index) {
    var task = Joseph.Menu.gameTasksystem.getTasks()[index];
    if (!task) return;

    var rect = this.itemRectForText(index);
    var statusWidth = this.statusWidth();
    var titleWidth = rect.width - statusWidth;

    this.changeTextColor(this.normalColor());
    this.drawText(task.title, rect.x, rect.y, titleWidth);

    this.changeTextColor(task.completed ? this.powerUpColor() : this.deathColor());
    this.drawText(task.completed ? "完成" : "未完成", rect.x + titleWidth, rect.y, statusWidth, 'right');
};

Window_TaskList.prototype.statusWidth = function() {
    return 120;
};

Window_TaskList.prototype.refresh = function() {
    this.createContents();
    this.drawAllItems();
};

function Scene_Logs() {
    this.initialize.apply(this, arguments);
}

Scene_Logs.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Logs.prototype.constructor = Scene_Logs;

Scene_Logs.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Logs.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createLogWindow();
};

Scene_Logs.prototype.createLogWindow = function() {
    this._logWindow = new CustomTextWindow(); // Create the window
    this._logWindow.setHandler('cancel', this.popScene.bind(this)); // Set handler
    this.addWindow(this._logWindow); // Add window to scene
    this._logWindow.refresh(); // Refresh the window to fetch data
};

function CustomTextWindow() {
    this.initialize.apply(this, arguments);
}

CustomTextWindow.prototype = Object.create(Window_Selectable.prototype);
CustomTextWindow.prototype.constructor = CustomTextWindow;

CustomTextWindow.prototype.initialize = function() {
    var width = Graphics.boxWidth;
    var height = Graphics.boxHeight;
    var x = 0;
    var y = 0;
    Window_Selectable.prototype.initialize.call(this, x, y, width, height);
    this.opacity = 255;
    this.createContents();
    this._lines = [];
    this._scrollY = 0;
    this._maxScrollY = 0;
    this._customFontSize = 16;
    // this._dataFetched = false;
    this.refresh();
    this.activate();
};

CustomTextWindow.prototype.standardFontSize = function() {
    return this._customFontSize;
};

CustomTextWindow.prototype.lineHeight = function() {
    return this._customFontSize + 4; // 调整行高以适应新的字体大小
};

CustomTextWindow.prototype.refresh = function() {
    this.contents.clear();
    this._lines = [];
    this._scrollY = 0;
    this._maxScrollY = 0;
    this.fetchAndDisplayText();
};

CustomTextWindow.prototype.fetchAndDisplayText = function() {
    var url = 'http://47.88.51.173:7013/api/SimulatedCampus/get/agents/history';

    var requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "DEBUG": false,
            "world_index": Joseph.worldIndex,
            "world_time": Joseph.worldTime - 1
        })
    };

    fetch(url, requestOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("Received data:", data);
            this.displayAgentHistory(data);
        })
        .catch(error => {
            console.error('Error:', error);
            this.renderText("Error occurred while fetching data: " + error.message);
        });
};

CustomTextWindow.prototype.displayAgentHistory = function(response) {
    if (response && response.body && Array.isArray(response.body.agents_history)) {
        var text = response.body.agents_history.map(this.createHistoryText.bind(this)).join('\n');
        this.renderText(text);
    } else {
        this.renderText("Invalid or empty response.");
    }
};

CustomTextWindow.prototype.createHistoryText = function(history) {
    var text = "";
    if (history.agent1_id !== undefined) {
        text += "Agent1 ID: " + history.agent1_id + "\n";
    }
    if (history.agent2_id !== undefined) {
        text += "Agent2 ID: " + history.agent2_id + "\n";
    }
    if (history.detail) {
        text += "Detail: " + history.detail + "\n";
    }
    return text;
};

CustomTextWindow.prototype.renderText = function(text) {
    var maxWidth = this.contents.width - this.padding * 2;
    var lines = [];
    var currentLine = '';
    var currentWidth = 0;

    this.contents.fontSize = this._customFontSize;

    for (var i = 0; i < text.length; i++) {
        var char = text[i];
        var charWidth = this.contents.measureTextWidth(char);

        if (char === '\n') {
            lines.push(currentLine);
            currentLine = '';
            currentWidth = 0;
            continue;
        }

        if (currentWidth + charWidth > maxWidth) {
            lines.push(currentLine);
            currentLine = char;
            currentWidth = charWidth;
        } else {
            currentLine += char;
            currentWidth += charWidth;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    this._lines = lines;
    this._maxScrollY = Math.max(0, (lines.length * this.lineHeight()) - this.contents.height);
    // this.scrollToBottom();
    this.drawAllText();
};

CustomTextWindow.prototype.scrollToBottom = function() {
    this._scrollY = this._maxScrollY;
};

CustomTextWindow.prototype.drawAllText = function() {
    this.contents.clear();
    this.contents.fontSize = this._customFontSize;
    var startLine = Math.floor(this._scrollY / this.lineHeight());
    var endLine = Math.min(this._lines.length, startLine + Math.ceil(this.contents.height / this.lineHeight()));

    for (var i = startLine; i < endLine; i++) {
        var y = i * this.lineHeight() - this._scrollY;
        this.contents.drawText(this._lines[i], 0, y, this.contents.width, this.lineHeight());
    }
};

CustomTextWindow.prototype.update = function() {
    Window_Selectable.prototype.update.call(this);

    // 处理滚轮输入
    if (TouchInput.wheelY !== 0) {
        this._scrollY = Math.max(0, Math.min(this._maxScrollY, this._scrollY + TouchInput.wheelY * 20));
        this.drawAllText();
    }
};

Joseph.Menu.Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    Joseph.Menu.Window_MenuCommand_addOriginalCommands.call(this);
    var optionsIndex = this._list.findIndex(command => command.symbol === 'options');
    if (optionsIndex >= 0) {
        this._list.splice(optionsIndex + 1, 0, { name: '任务', symbol: 'task', enabled: true, ext: null });
        this._list.splice(optionsIndex + 1, 0, { name: '对话历史', symbol: 'log', enabled: true, ext: null })
    } else {
        this.addCommand('任务', 'task');
        this.addCommand('对话历史', 'log');
    }
};

Joseph.Menu.Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
    Joseph.Menu.Game_Interpreter_pluginCommand.call(this, command, args);
    if (command === 'AddTask') {
        Joseph.Menu.gameTasksystem.addTask(args[0], args[1], args[2] === 'true');
    }
};

})();