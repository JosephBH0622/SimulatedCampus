/*:
 * @plugindesc Creates a custom text window with streaming display, word wrap, and scrolling.
 * @author Claude
 *
 * @help This plugin creates a custom window on the right side of the game screen
 * that displays streaming text fetched from an API, with word wrap and scrolling support.
 */

var Imported = Imported || {};
Imported.Joseph_logHistory = true;

var Joseph = Joseph || {};
Joseph.log = Joseph.log || {};

(function() {
    function CustomTextWindow() {
        this.initialize.apply(this, arguments);
    }

    CustomTextWindow.prototype = Object.create(Window_Selectable.prototype);
    CustomTextWindow.prototype.constructor = CustomTextWindow;

    CustomTextWindow.prototype.initialize = function() {
        var width = Graphics.boxWidth / 3;
        var height = Graphics.boxHeight;
        var x = Graphics.boxWidth - width;
        var y = 0;
        Window_Base.prototype.initialize.call(this, x, y, width, height);
        this.opacity = 255;
        this.createContents();
        this._lines = [];
        this._scrollY = 0;
        this._maxScrollY = 0;
        this._customFontSize = 16;
        this.refresh();
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
        var url = 'http://192.168.31.160:8088/api/SimulatedCampus/get/agents/history';

        var requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "DEBUG": false,
                "world_index": "0",
                "world_time": Joseph.worldTime
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
        this.scrollToBottom();
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
        Window_Base.prototype.update.call(this);
        if (TouchInput.wheelY !== 0) {
            this._scrollY = Math.max(0, Math.min(this._maxScrollY, this._scrollY + TouchInput.wheelY * 20));
            this.drawAllText();
        }
    };

    Joseph.log.Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        Joseph.log.Scene_Map_createAllWindows.call(this);
        this.createCustomTextWindow();
    };

    Scene_Map.prototype.createCustomTextWindow = function() {
        this._customTextWindow = new CustomTextWindow();
        this.addWindow(this._customTextWindow);
    };
})();