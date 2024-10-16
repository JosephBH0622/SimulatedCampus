//-----------------------------------------------------------------------------
//  Display Name: Joseph's AI Talk Event
//-----------------------------------------------------------------------------
//  For: RPG MAKER MV
//  Script Name: Joseph_AITalkEnCn.js
//  Version: 1.0
//-----------------------------------------------------------------------------
//  Latest Edition Date: 2024-08-13
//-----------------------------------------------------------------------------
//  Terms can be found at:
//  WeChat: 18813197112
//-----------------------------------------------------------------------------

var Imported = Imported || {};
Imported.Joseph_AITalk = true;

var Joseph = Joseph || {};
Joseph.setPlan = Joseph.setPlan || {};
Joseph.AITalk = Joseph.AITalk || {};
Joseph.Move = Joseph.Move || {};

//-----------------------------------------------------------------------------
/*:
 * @plugindesc (v.1.0) A plugin for user input and AI response, with an exit button and history feature.
 *
 * @author Joseph - WeChat: 18813197112
 *
 * @help
 * This plugin creates a pop-up input window, sends user input to OpenAI, and
 * displays the response.
 *
 * Usage:
 *
 *   1. Call the plugin command "ShowInputWindow" in an event
 *   2. User input will be saved to variable ID 1
 *   3. OpenAI's response will be saved to variable ID 2
 *   4. Conversation history will be saved to variable ID 3
 *   5. Press Enter to confirm input and send the request
 *   6. Use the ESC key to switch between the input box and the exit button
 *   7. Call the plugin command "ClearAIHistory" at the end of the conversation to clear the history
 */



//-----------------------------------------------------------------------------
//  CODE STUFFS
//-----------------------------------------------------------------------------

// function removeEmojis(str) {
//     return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
// };


(function() {
    var Joseph_Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        Joseph_Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'ShowInputWindow') {
            if (Joseph.setPlan.eventEmitter.isRunning) {
                Joseph.setPlan.eventEmitter.stop();
                Joseph.Move.pauseGlobalUpdate();
            }
            SceneManager.push(Scene_Input);
        } else if (command === 'ClearAIHistory') {
            if (!Joseph.setPlan.eventEmitter.isRunning && Joseph.setPlan.eventEmitter.remainingSeconds !== Joseph.setPlan.eventEmitter.totalSeconds) {
                Joseph.setPlan.eventEmitter.start();
                Joseph.Move.resumeGlobalUpdate();
            }
            Joseph.AITalk.saveHistoryToFile();
            console.log($gameVariables.value(5));
            console.log($gameVariables.value(3));
            Joseph.AITalk.uploadToVecDatabase($gameVariables.value(5), $gameVariables.value(3) || '');
            $gameVariables.setValue(3, '');
        }
    };

    Joseph.AITalk.updateHistory = function(newText) {
        var history = $gameVariables.value(3) || '';
        history += newText + '\n\n';
        $gameVariables.setValue(3, history);
    };

    Joseph.AITalk.uploadToVecDatabase = function(NpcName, history) {
        let url = Joseph.ALIYUN_URL + "/history";
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                DEBUG: false,
                world_index: Joseph.worldIndex,
                world_time: Joseph.worldTime - 1,
                plan_id: 0,
                name: NpcName,
                detail: history,
            }),
        }).then(response => {
            if (!response.ok) {
                console.error('Post to VecDatabase failed:', response.status);
            }
        }).catch(error => {
            console.error('VecDatabase Error:', error);
        });
    }

    Joseph.AITalk.saveHistoryToFile = function() {
        var history = $gameVariables.value(3);
        if (history) {
            var currentDate = new Date();
            var formattedDate = currentDate.getFullYear() + '-' +
                                ('0' + (currentDate.getMonth() + 1)).slice(-2) + '-' +
                                ('0' + currentDate.getDate()).slice(-2) + '_' +
                                ('0' + currentDate.getHours()).slice(-2) + '-' +
                                ('0' + currentDate.getMinutes()).slice(-2) + '-' +
                                ('0' + currentDate.getSeconds()).slice(-2);
            var filename = 'AIHistory_' + formattedDate + '.txt';
            var fs = require('fs');
            var path = require('path');
            var filePath = path.join(process.cwd(), 'DialogHistory', filename);
            fs.writeFile(filePath, history, function(err) {
                if (err) {
                    console.error('Failed to save history file:', err);
                } else {
                    console.log('History saved to ' + filename);
                }
            });
        }
    };

    function Scene_Input() {
        this.initialize.apply(this, arguments);
    }

    Scene_Input.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Input.prototype.constructor = Scene_Input;

    Scene_Input.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
        this._inputText = '';
    };

    Scene_Input.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createInputField();
        this.createNPCNameWindow();
        this.createInputWindow();
        this.createExitButton();
    };

    Scene_Input.prototype.createInputField = function() {
        this._inputField = document.createElement('input');
        this._inputField.type = 'text';
        this._inputField.style.position = 'absolute';
        this._inputField.style.opacity = '0.5';
        this._inputField.style.pointerEvents = 'none';
        this._inputField.style.top = '0';
        this._inputField.style.left = '0';
        this._inputField.style.width = '1px';
        this._inputField.style.height = '1px';
        document.body.appendChild(this._inputField);
        this._inputField.addEventListener('input', this.onInput.bind(this));
        this._inputField.addEventListener('keydown', this.onKeyDown.bind(this));
        this._inputField.focus();
    };

    Scene_Input.prototype.onInput = function() {
        this._inputText = this._inputField.value;
        this._inputWindow.refresh();
    };

    Scene_Input.prototype.onKeyDown = function(event) {
        if (event.key === 'Backspace' && this._inputField.value.length > 0) {
            this._inputField.value = this._inputField.value.slice(0, -1);
            this._inputText = this._inputField.value;
            this._inputWindow.refresh();
        }
    };

    Scene_Input.prototype.createNPCNameWindow = function() {
        var x = 0;
        var y = Graphics.boxHeight * 3/4 - 72;
        this._npcNameWindow = new Window_NPCName(x, y);
        this.addWindow(this._npcNameWindow);
    };

    Scene_Input.prototype.createInputWindow = function() {
        this._inputWindow = new Window_UserInput();
        this.addWindow(this._inputWindow);
        this._inputWindow.setHandler('ok', this.onInputOk.bind(this));
        this._inputWindow.setHandler('cancel', this.onInputCancel.bind(this));
    };

    Scene_Input.prototype.createExitButton = function() {
        this._exitButton = new Window_ExitButton();
        this.addWindow(this._exitButton);
        this._exitButton.setHandler('ok', this.popScene.bind(this));
        this._exitButton.setHandler('cancel', this.onExitCancel.bind(this));
    };

    Scene_Input.prototype.start = function() {
        Scene_MenuBase.prototype.start.call(this);
        this._npcNameWindow.refresh();
        this._inputWindow.activate();
        this._exitButton.deactivate();
    };

    Scene_Input.prototype.onInputOk = function() {
        var userInput = this._inputWindow.getText().trim();
        if (userInput !== '') {
            $gameVariables.setValue(1, userInput);
            this.sendToOpenAI(userInput);
        } else {
            this._inputWindow.activate();
        }
    };

    Scene_Input.prototype.onInputCancel = function() {
        this._inputWindow.deactivate();
        this._exitButton.activate();
    };

    Scene_Input.prototype.onExitCancel = function() {
        this._exitButton.deactivate();
        this._inputWindow.activate();
    };

    Scene_Input.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        if (this._inputWindow.active && Input.isTriggered('cancel')) {
            this.onInputCancel();
        } else if (this._exitButton.active && Input.isTriggered('cancel')) {
            this.onExitCancel();
        }
    };

    Scene_Input.prototype.sendToOpenAI = function(prompt) {
        SceneManager.push(Scene_ShowAIResponse);
        let temp_history = prompt;

        // Function to remove emojis from text
        function removeEmojis(text) {
            return text.replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu, '');
        }

        if (Joseph.realWorldNpcList.includes($gameVariables.value(5))) {
            let url = Joseph.ALIYUN_URL + "/chat";
            let chatPostBody = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: $gameVariables.value(5),
                    query: prompt,
                    history: $gameVariables.value(3) || '',
                    stream: true,
                    DEBUG: false,
                })
            }
        } else if (Joseph.loveNpcList.includes($gameVariables.value(5))) {
            let url = Joseph.ALIYUN_URL + "/love/chat";
            let chatPostBody = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: $gameVariables.value(5),
                })
            }
        }

        fetch(
            url,
            chatPostBody
        ).then(response => {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let accumulatedResponse = '';

            const processText = ({ done, value }) => {
                if (done) {
                    let QAndA = "Player: " + temp_history + "\n" + `${$gameVariables.value(5)}: ` + accumulatedResponse;
                    console.log(QAndA);
                    Joseph.AITalk.updateHistory(QAndA);
                    return;
                }

                buffer += decoder.decode(value, { stream: true });
                console.log("Received raw data:", buffer);

                let chunks = buffer.split('\n');
                buffer = chunks.pop();

                for (let chunk of chunks) {
                    if (chunk.trim().length > 0) {
                        console.log("Processing chunk:", chunk);
                        try {
                            if (chunk.startsWith('data: ')) {
                                chunk = chunk.slice(6);
                            }

                            let parsedChunk = JSON.parse(chunk);
                            if (parsedChunk.text) {
                                // Remove emojis from the text
                                let filteredText = removeEmojis(parsedChunk.text);
                                accumulatedResponse += filteredText;
                                $gameVariables.setValue(2, accumulatedResponse);
                                if (SceneManager._scene instanceof Scene_ShowAIResponse) {
                                    SceneManager._scene._displayWindow.updateContent();
                                }
                            }
                        } catch (e) {
                            console.error('Error parsing chunk:', e);
                            console.error('Problematic chunk:', chunk);
                            // If JSON parsing fails, treat the chunk as plain text and remove emojis
                            let filteredChunk = removeEmojis(chunk);
                            accumulatedResponse += filteredChunk;
                            $gameVariables.setValue(2, accumulatedResponse);
                            if (SceneManager._scene instanceof Scene_ShowAIResponse) {
                                SceneManager._scene._displayWindow.updateContent();
                            }
                        }
                    }
                }

                return reader.read().then(processText);
            };

            return reader.read().then(processText);
        }).catch(error => {
            console.error('API request failed:', error);
            SceneManager.pop();
        });
    };

    function Window_NPCName() {
        this.initialize.apply(this, arguments);
    }

    Window_NPCName.prototype = Object.create(Window_Base.prototype);
    Window_NPCName.prototype.constructor = Window_NPCName;

    Window_NPCName.prototype.initialize = function(x, y) {
        var width = this.windowWidth();
        var height = this.windowHeight();
        Window_Base.prototype.initialize.call(this, x, y, width, height);
        this.refresh();
    };

    Window_NPCName.prototype.windowWidth = function() {
        return 180;
    };

    Window_NPCName.prototype.windowHeight = function() {
        return 72;
    };

    Window_NPCName.prototype.refresh = function() {
        this.contents.clear();
        var npcName = $gameVariables.value(5) || '';
        this.changeTextColor(this.systemColor());
        this.drawText(npcName, 0, 0, this.contentsWidth(), 'center');
        this.resetTextColor();
    };

    function Window_UserInput() {
        this.initialize.apply(this, arguments);
    }

    Window_UserInput.prototype = Object.create(Window_Selectable.prototype);
    Window_UserInput.prototype.constructor = Window_UserInput;

    Window_UserInput.prototype.initialize = function(x, y) {
        var x = 0;
        var y = Graphics.boxHeight * 3/4;
        Window_Selectable.prototype.initialize.call(this, x, y, this.windowWidth(), this.windowHeight());
        this._text = '';
        this._lines = [];
        this._cursorVisible = true;
        this._cursorCount = 0;
        this._handlers = {};
        this._lineCount = 0;
        this.createContents();
        this.refresh();
    };

    Window_UserInput.prototype.windowWidth = function() {
        return Graphics.boxWidth;
    };

    Window_UserInput.prototype.windowHeight = function() {
        return Graphics.boxHeight / 4;
    };

    Window_UserInput.prototype.maxItems = function() {
        return this._lines ? this._lines.length: 0;
    };

    Window_UserInput.prototype.itemHeight = function() {
        return this.lineHeight();
    };

    Window_UserInput.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        this.processWheel();
        this.updateCursor();
        if (Input.isTriggered("ok")) {
            this._lineCount = 0;
        }
    };

    Window_UserInput.prototype.updateCursor = function() {
        this._cursorCount++;
        if (this._cursorCount >= 15) {
            this._cursorVisible = !this._cursorVisible;
            this._cursorCount = 0;
            this.refresh();
        }
    };

    Window_UserInput.prototype.refresh = function() {
        this.contents.clear();
        var scene = SceneManager._scene;
        this._text = scene._inputText;
        this._lines = this.splitIntoLines("请输入：" + this._text);
        this.drawAllItems();

        if (this._lineCount < this.maxItems()) {
            this.scrollDown();
            this._lineCount = this.maxItems();
        }
    };

    Window_UserInput.prototype.splitIntoLines = function(text) {
        var lines = [];
        var line = '';
        var width = this.contentsWidth();

        for (var i = 0; i < text.length; i++) {
            var character = text[i];
            var testLine = line + character;
            var testWidth = this.textWidth(testLine);

            if (testWidth > width && line) {
                lines.push(line);
                line = character;
            } else {
                line = testLine;
            }
        }
        if (line) {
            lines.push(line);
        }
        return lines;
    };

    Window_UserInput.prototype.drawItem = function(index) {
        var line = this._lines[index];
        var rect = this.itemRectForText(index);
        this.drawText(line, rect.x, rect.y, rect.width);
        if (index === this.maxItems() - 1 && this._cursorVisible) {
            var cursorX = rect.x + this.textWidth(line);
            this.drawText('|', cursorX, rect.y, this.textWidth('|'));
        }
    };

    Window_UserInput.prototype.getText = function() {
        return this._text;
    };

    function Window_ExitButton() {
        this.initialize.apply(this, arguments);
    }

    Window_ExitButton.prototype = Object.create(Window_Command.prototype);
    Window_ExitButton.prototype.constructor = Window_ExitButton;

    Window_ExitButton.prototype.initialize = function() {
        var x = Graphics.boxWidth - this.windowWidth();
        var y = Graphics.boxHeight * 3/4 - this.windowHeight();
        Window_Command.prototype.initialize.call(this, x, y);
    };

    Window_ExitButton.prototype.makeCommandList = function() {
        this.addCommand('Exit', 'ok');
    };

    Window_ExitButton.prototype.windowWidth = function() {
        return 100;
    };

    Window_ExitButton.prototype.windowHeight = function() {
        return this.fittingHeight(1);
    };

    function Scene_ShowAIResponse() {
        this.initialize.apply(this, arguments);
    }

    Scene_ShowAIResponse.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_ShowAIResponse.prototype.constructor = Scene_ShowAIResponse;

    Scene_ShowAIResponse.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_ShowAIResponse.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createDisplayWindow();
        this.createNPCNameWindow();
    };

    Scene_ShowAIResponse.prototype.createDisplayWindow = function() {
        this._displayWindow = new Window_AIResponse();
        this.addWindow(this._displayWindow);
    };

    Scene_ShowAIResponse.prototype.createNPCNameWindow = function() {
        var x = 0;
        var y = Graphics.boxHeight * 3/4 - 72;
        this._npcNameWindow = new Window_NPCName(x, y);
        this.addWindow(this._npcNameWindow);
    };

    function Window_AIResponse() {
        this.initialize.apply(this, arguments);
    }

    Window_AIResponse.prototype = Object.create(Window_Selectable.prototype);
    Window_AIResponse.prototype.constructor = Window_AIResponse;

    Window_AIResponse.prototype.initialize = function() {
        var x = 0;
        var y = Graphics.boxHeight * 3 / 4;
        var width = Graphics.boxWidth;
        var height = Graphics.boxHeight * 1 / 4;
        Window_Selectable.prototype.initialize.call(this, x, y, width, height);
        this._text = '';
        this.refresh();
    };

    Window_AIResponse.prototype.maxItems = function() {
        return this._lines ? this._lines.length : 1;
    };

    Window_AIResponse.prototype.lineHeight = function() {
        return 36;
    };

    Window_AIResponse.prototype.updateContent = function() {
        var newText = $gameVariables.value(2) || '';
        if (newText !== this._text) {
            this._text = newText;
            this.refresh();
        }
    };

    Window_AIResponse.prototype.refresh = function() {
        this.contents.clear();
        this._lines = this.convertEscapeCharacters(this._text).split('\n');
        this._lines = this.wrapText(this._lines);
        this.createContents();
        this.drawAllItems();
    };
    Window_AIResponse.prototype.wrapText = function(lines) {
        var wrappedLines = [];
        lines.forEach(function(line) {
            var currentLine = '';
            for (var i = 0; i < line.length; i++) {
                var char = line[i];
                var testLine = currentLine + char;
                var testWidth = this.textWidth(testLine);
                if (testWidth > this.contentsWidth()) {
                    wrappedLines.push(currentLine);
                    currentLine = char;
                } else {
                    currentLine = testLine;
                }
            }
            wrappedLines.push(currentLine);
        }, this);
        return wrappedLines;
    };

    Window_AIResponse.prototype.drawItem = function(index) {
        var line = this._lines[index];
        var rect = this.itemRectForText(index);
        this.drawTextEx(line, rect.x, rect.y, rect.width);
    };

    Window_AIResponse.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        if (Input.isRepeated('down')) {
            this.scrollDown();
        }
        if (Input.isRepeated('up')) {
            this.scrollUp();
        }
        if (Input.isTriggered('ok') || Input.isTriggered('cancel')) {
            SceneManager.pop();
        }
    };
})();