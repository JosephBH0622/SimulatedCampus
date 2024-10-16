/*:
 * @plugindesc 简单的过场动画插件 v1.0
 * @author YourName
 *
 * @help 这个插件提供了一个简单的方法来创建和播放过场动画。
 *
 * 插件命令:
 *   SimpleCutscene play      # 播放预设的过场动画
 */
var Joseph = Joseph || {};

(function() {
    Joseph.text = "This is a short demonstration on how to make a simple cutscene. There is no wrong way to make your cutscenes, so try different things and see what looks the best for your game.";
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === "SimpleCutscene") {
            playCutscene(Joseph.text);
        }
    };

    function playCutscene(text) {
        var lines = autoLineBreak(text);

        var cutsceneEvent = [
            { code: 355, parameters: ["$gamePlayer.setTransparent(true);"] },
            { code: 221, parameters: [] }, // Fade out
            { code: 230, parameters: [60] }, // Wait 60 frames
            { code: 105, parameters: [2, 0] } // Start scrolling text
        ];

        // Add each line of text
        lines.forEach(function(line) {
            cutsceneEvent.push({ code: 405, parameters: [line] });
        });

        cutsceneEvent = cutsceneEvent.concat([
            { code: 222, parameters: [] }, // Fade in
            { code: 230, parameters: [60] }, // Wait 60 frames
            { code: 355, parameters: ["$gamePlayer.setTransparent(false);"] },
            { code: 356, parameters: ["StartSetPlan"]},
            { code: 0 } // End of event
        ]);

        // 将cutsceneEvent赋给公共事件10
        $dataCommonEvents[10].list = cutsceneEvent;

        // 使用reserveCommonEvent来执行公共事件10
        $gameTemp.reserveCommonEvent(10);
    }

    function autoLineBreak(text, maxWidth = 54) {
        var lines = [];
        var currentLine = '';
        var currentWidth = 0;
        var words = text.split(/(\s+)/);

        for (var i = 0; i < words.length; i++) {
            var word = words[i];
            var wordWidth = getTextWidth(word);

            if (currentWidth + wordWidth > maxWidth) {
                if (currentLine) {
                    lines.push(currentLine.trim());
                    currentLine = '';
                    currentWidth = 0;
                }
                if (wordWidth > maxWidth) {
                    var subLines = breakLongWord(word, maxWidth);
                    lines = lines.concat(subLines.slice(0, -1));
                    currentLine = subLines[subLines.length - 1];
                    currentWidth = getTextWidth(currentLine);
                } else {
                    currentLine = word;
                    currentWidth = wordWidth;
                }
            } else {
                currentLine += word;
                currentWidth += wordWidth;
            }
        }

        if (currentLine) {
            lines.push(currentLine.trim());
        }

        return lines;
    }

    function getTextWidth(text) {
        var width = 0;
        for (var i = 0; i < text.length; i++) {
            width += getCharWidth(text[i]);
        }
        return width;
    }

    function getCharWidth(char) {
        if (/[\u4e00-\u9fa5]/.test(char)) {
            return 2; // 中文字符宽度为2
        } else {
            return 1; // 其他字符宽度为1
        }
    }

    function breakLongWord(word, maxWidth) {
        var lines = [];
        var currentLine = '';
        var currentWidth = 0;

        for (var i = 0; i < word.length; i++) {
            var char = word[i];
            var charWidth = getCharWidth(char);

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

        return lines;
    }
})();