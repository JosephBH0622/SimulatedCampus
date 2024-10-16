//=============================================================================
// NPC Name Display
// Version: 1.0
// Author: Claude
//=============================================================================

/*:
 * @plugindesc 在NPC头顶显示名字
 * @author Claude
 *
 * @help 这个插件会在NPC（事件）的精灵头顶显示名字。
 * 名字从事件的Note标签中提取，格式为 <Name: xxx>
 */
var Imported = Imported || {};
Imported.Joseph_HeadName = true;

var Joseph = Joseph || {};
Joseph.HName = Joseph.HName || {};

(function() {
    // 扩展Sprite_Character类来添加名字显示
    Joseph.HName.Sprite_Character_initialize = Sprite_Character.prototype.initialize;
    Sprite_Character.prototype.initialize = function(character) {
        Joseph.HName.Sprite_Character_initialize.call(this, character);
        this.createNameSprite();
    };

    Sprite_Character.prototype.createNameSprite = function() {
        this._nameSprite = new Sprite();
        this._nameSprite.bitmap = new Bitmap(120, 20);
        this._nameSprite.anchor.x = 0.5;
        this._nameSprite.anchor.y = 1;
        this.addChild(this._nameSprite);
    };

    Joseph.HName.Sprite_Character_update = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function() {
        Joseph.HName.Sprite_Character_update.call(this);
        this.updateNameSprite();
    };

    Sprite_Character.prototype.updateNameSprite = function() {
    //     if (this._character instanceof Game_Event) {
    //         var name = this.extractName(this._character.event().note);
    //         if (name) {
    //             this._nameSprite.bitmap.clear();
    //             this._nameSprite.bitmap.fontSize = 14; // 调整字体大小
    //             this._nameSprite.bitmap.drawText(name, 0, 0, 120, 20, 'center');
    //             this._nameSprite.y = -this.height;
    //         }
    //     }
    // };
        if (this._character instanceof Game_Event) {
            var name = this.extractName();
            if (name) {
                this._nameSprite.bitmap.clear();
                this._nameSprite.bitmap.fontSize = 14; // 调整字体大小
                this._nameSprite.bitmap.drawText(name, 0, 0, 120, 20, 'center');
                this._nameSprite.y = -this.height;
                this._nameSprite.visible = true;
            } else {
                this._nameSprite.visible = false;
            }
        } else {
            this._nameSprite.visible = false;
        }
    };

    Sprite_Character.prototype.extractName = function() {
        if (!this._character || !this._character.event) {
            return null;
        }
        var event = this._character.event();
        if (!event || !event.note) {
            return null;
        }
        var match = /<Name:\s*(.+?)>/i.exec(event.note);
        return match ? match[1].trim() : null;
    };
})();