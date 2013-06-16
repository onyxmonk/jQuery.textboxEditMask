var _this = this;
jQuery.fn.outerHTML = function (s) {
    return (s) ? this.before(s).remove() : jQuery("&lt;p&gt;").append(this.eq(0).clone()).html();
};
$(document).ready(function () {
    $(":input[editMask]").each(function () {
        var em = $(this).attr("editMask");
        var dt = $(this).attr("defaultEditMask");
        $(this).setMask(em, dt);
    });
});
$.fn.extend({
    setMask: function (mask, defaultText, handler) {
        var em;
        var tb = $(this);
        if (tb.data("editMask") != null) {
            em = tb.data("editMask");
        }
        if (mask == null || mask == "") {
            if (em != null) {
                tb.data("editMask", null);
            }
            return;
        }
        if (em == null) {
            em = new textboxEditMask(this, mask, defaultText, handler);
            tb.data("editMask", em);
        } else {
            em.editMask = mask;
        }
    }
});
$.extend({
    getMaskObject: function () {
        var tb = $(this);
        if (tb == null) {
            return null;
        }
        return tb.data("editMask");
    }
});
var textboxEditMask = (function () {
    function textboxEditMask(textBox, editMask, defaultText, validationHandler) {
        this.textBox = textBox;
        this.editMask = editMask;
        this.defaultText = defaultText;
        this.validationHandler = validationHandler;
        this._wildcards = "#&@_><!^";
        this.init();
    }
    textboxEditMask.prototype.processKeyPress = function () {
        if (this.isKeyNonprintable(event.keyCode) == true) {
            this.processNonPrintableKeyPress();
        } else {
            this.processPrintableKeyPress();
        }
    };
    textboxEditMask.prototype.init = function () {
        var _this = this;
        var tb = $(this.textBox);
        tb.keydown(function () {
            _this.processKeyPress();
        });
        tb.keypress(function () {
            _this.fixCharacterCase();
        });
        tb.keyup(function () {
            if (event.keyCode != 8 && event.keyCode != 37) {
                _this.positionAtNextEditable();
            }
            _this.validate();
        });
        this.setMask(this.editMask);
    };
    textboxEditMask.prototype.caretPos = function () {
        var retval = 0;
        if (this.textBox.selectionStart != null) {
            retval = this.textBox.selectionStart;
        } else if (document.selection) {
            var r = document.selection.createRange().duplicate();
            if (r.parentElement() != this.textBox) {
                $(this.textBox).focus();
                r = document.selection.createRange().duplicate();
            }
            while(r.move("character", -1) != 0) {
                retval++;
            }
        }
        return retval;
    };
    textboxEditMask.prototype.inputValue = function (text) {
        if (text != null) {
            $(this.textBox).val(text);
        } else {
            return $(this.textBox).val();
        }
    };
    textboxEditMask.prototype.isInputAllowed = function (mask) {
        if (mask == null) {
            return false;
        }
        if (mask.length > 2) {
            return true;
        }
        var c = mask.substring(0, 1);
        if (c == '\\') {
            return false;
        }
        if (mask.length == 2) {
            return true;
        }
        if (this._wildcards.indexOf(c) > -1) {
            return true;
        }
        return false;
    };
    textboxEditMask.prototype.moveForward = function () {
        if (this.caretPos() == this.inputValue().length) {
            return false;
        }
        this.moveTo(this.caretPos() + 1);
        return true;
    };
    textboxEditMask.prototype.moveBackward = function () {
        if (this.caretPos() == 0) {
            return false;
        }
        this.moveTo(this.caretPos() - 1);
        return true;
    };
    textboxEditMask.prototype.moveToStart = function () {
        this.moveTo(0);
    };
    textboxEditMask.prototype.moveToEnd = function () {
        this.moveTo(999999);
    };
    textboxEditMask.prototype.moveTo = function (pos, posLength) {
        if (pos < 0) {
            pos = 0;
        }
        if (pos > this.inputValue().length) {
            pos = this.inputValue().length;
        }
        if (posLength == null || posLength < 0) {
            posLength = 0;
        }
        if (posLength + pos > this.inputValue().length) {
            posLength = this.inputValue().length - pos;
        }
        if (this.textBox.setSelectionRange) {
            this.textBox.setSelectionRange(pos, pos + posLength);
        } else {
            var r = document.selection.createRange().duplicate();
            r.move("character", pos - this.caretPos());
            r.moveEnd("character", posLength);
            r.select();
        }
    };
    textboxEditMask.prototype.positionAtPreviousEditable = function () {
        return this._positionAtEditable(true);
    };
    textboxEditMask.prototype.positionAtNextEditable = function () {
        return this._positionAtEditable(false);
    };
    textboxEditMask.prototype._positionAtEditable = function (back) {
        var offset = 0;
        if (back == true) {
            offset = -1;
        }
        var pos = this.caretPos() + offset;
        if (pos != this.validateThroughPos(pos)) {
            return;
        }
        var msk = this.lookupMask(pos);
        if (msk == "") {
            return false;
        }
        while(!this.isInputAllowed(msk)) {
            if (back == true) {
                if (this.moveBackward() == false) {
                    return false;
                }
                this.placeChar(this.getDefaultMaskForPosition(pos), true);
            } else {
                this.placeChar(msk, true);
                if (this.moveForward() == false) {
                    return false;
                } else {
                    if (this.caretPos() == this.inputValue().length) {
                        this.validateThroughPos(this.caretPos());
                    }
                }
            }
            pos = this.caretPos() + offset;
            msk = this.lookupMask(pos);
        }
        return true;
    };
    textboxEditMask.prototype.validate = function () {
        if (this.isValidAndComplete() == true) {
            $(this.textBox).addClass("editMaskValidated");
            $(this.textBox).removeClass("editMaskNotValidated");
            return true;
        } else {
            $(this.textBox).removeClass("editMaskValidated");
            $(this.textBox).addClass("editMaskNotValidated");
            return false;
        }
    };
    textboxEditMask.prototype.isValidAndComplete = function () {
        var retval = true;
        var iv = this.inputValue();
        if (this.validateThroughPos(-1, false) != iv.length) {
            retval = false;
        } else {
            for(var t = 0; t < iv.length && retval == true; t++) {
                retval = this.isKeyCodeGoodAtPosition(iv.substring(t, t + 1).charCodeAt(0), t);
            }
        }
        return retval;
    };
    textboxEditMask.prototype.validateThroughPos = function (pos, highlight) {
        if (typeof highlight === "undefined") { highlight = true; }
        if (this._validateArray == null) {
            return pos;
        }
        if (pos > -1) {
            if (this._validateArray.length <= pos) {
                return pos;
            }
            if (this._validateArray[pos] == null) {
                return pos;
            }
        }
        if (pos == -1) {
            pos = this.inputValue().length;
        }
        var startpos = 0;
        var max = (pos > this._validateArray.length) ? this._validateArray.length : pos;
        for(var t = 0; t <= max; t++) {
            if (this._validateArray[t] != null) {
                if (this._validateArray[t] != '.novalidation') {
                    var validationvalue = this._validateArray[t];
                    var stringtovalidate = this.inputValue().substring(startpos, t);
                    var re = new RegExp(validationvalue);
                    if (re.test(stringtovalidate) == false) {
                        if (highlight == true) {
                            this.moveTo(startpos, t - startpos);
                        }
                        return startpos;
                    }
                }
                startpos = t;
            }
        }
        if (this.validationHandler != null) {
            this.validationHandler(this);
        }
        return pos;
    };
    textboxEditMask.prototype.setMask = function (mask) {
        this.editMask = mask;
        this.parseMask();
        if (this.inputValue() == "") {
            this.inputValue(this.getDefaultMask());
        }
        this.validate();
    };
    textboxEditMask.prototype.getDefaultMask = function () {
        var retval = "";
        if (this._maskArray.length > 0) {
            for(var pos = 0; pos < this._maskArray.length; pos++) {
                retval += this.getDefaultMaskForPosition(pos);
            }
        }
        return retval;
    };
    textboxEditMask.prototype.getDefaultMaskForPosition = function (pos) {
        var retval;
        if (this.defaultText == null || this.defaultText.length < pos) {
            retval = this.getDefaultMaskForToken(this._maskArray[pos]);
        } else {
            retval = this.defaultText.substr(pos, 1);
        }
        return retval;
    };
    textboxEditMask.prototype.getDefaultMaskForToken = function (s) {
        if (s.length == 1 && this._wildcards.indexOf(s) != -1) {
            if (s == "#") {
                return "0";
            }
            return " ";
        }
        if (s.length == 1 || (s.length == 2 && s.substring(0, 1) == '\\')) {
            s = this.replaceAll(s, "\\", "");
            return s;
        }
        if (s.indexOf(" ") != -1) {
            return " ";
        }
        return s.substring(0, 1);
    };
    textboxEditMask.prototype.getDefaultInputForToken = function (s) {
        if (s == "#") {
            return " ";
        }
        return this.getDefaultMaskForToken(s);
    };
    textboxEditMask.prototype.getDefaultInputForPosition = function (pos) {
        if (this.defaultText == null || this.defaultText.length < pos) {
            return this.getDefaultInputForToken(this._maskArray[pos]);
        }
        return this.getDefaultMaskForPosition(pos);
    };
    textboxEditMask.prototype.isKeyUppercase = function (c) {
        return (c >= 65 && c <= 90);
    };
    textboxEditMask.prototype.isKeyLowercase = function (c) {
        return (c >= 97 && c <= 122);
    };
    textboxEditMask.prototype.isKeyAlpha = function (c) {
        return (this.isKeyUppercase(c) || this.isKeyLowercase(c));
    };
    textboxEditMask.prototype.isKeyNumeric = function (c) {
        return (c >= 0x30 && c <= 0x39);
    };
    textboxEditMask.prototype.isKeyNonprintable = function (c) {
        if (c == 16) {
            return true;
        }
        if (c >= 35 && c <= 40) {
            return true;
        }
        if (c == 9) {
            return true;
        }
        return false;
    };
    textboxEditMask.prototype.toLowercaseKey = function (c) {
        if (this.isKeyAlpha(c) && !this.isKeyLowercase(c)) {
            return (c + 32);
        }
        return c;
    };
    textboxEditMask.prototype.toUppercaseKey = function (c) {
        if (this.isKeyAlpha(c) && !this.isKeyUppercase(c)) {
            return (c - 32);
        }
        return c;
    };
    textboxEditMask.prototype.toCharFromKey = function (code) {
        return decodeURI('%' + code.toString(16));
    };
    textboxEditMask.prototype.fixCharacterCase = function () {
        var pos = this.caretPos();
        var mask = this.lookupMask(pos);
        var good = false;
        for(var t = 0; t < mask.length; t++) {
            var chr = mask.substring(t, t + 1);
            switch(chr) {
                case '_':
                case '@':
                case '&':
                case '#':
                    return;
                    break;
                case '>':
                    if (this.isKeyUppercase(event.keyCode)) {
                        good = true;
                    }
                    break;
                case '<':
                    if (this.isKeyLowercase(event.keyCode)) {
                        good = true;
                    }
                    break;
                case '!':
                    if (this.isKeyNumeric(event.keyCode) || this.isKeyLowercase(event.keyCode)) {
                        good = true;
                    }
                    break;
                case '^':
                    if (this.isKeyNumeric(event.keyCode) || this.isKeyUppercase(event.keyCode)) {
                        good = true;
                    }
                    break;
                default:
                    if (chr == '\\') {
                        t++;
                        chr = mask.substring(t, t + 1);
                    }
                    if (chr.charCodeAt(0) == event.keyCode) {
                        good = true;
                    }
            }
            if (good == true) {
                return;
            }
        }
        var key = event.keyCode;
        if (!this.isKeyUppercase(key)) {
            key -= 32;
        } else {
            key += 32;
        }
        this.placeKey(key);
    };
    textboxEditMask.prototype.placeKey = function (keyCode) {
        event.returnValue = false;
        this.placeChar(this.toCharFromKey(keyCode));
    };
    textboxEditMask.prototype.placeChar = function (char, suppressCaretMovement) {
        var offset = 1;
        if (suppressCaretMovement == true) {
            offset = 0;
        }
        var charpos = this.caretPos();
        this.inputValue(this.inputValue().substr(0, this.caretPos()) + char + this.inputValue().substr(this.caretPos() + 1, 99999));
        this.moveTo(charpos + offset);
    };
    textboxEditMask.prototype.parseMask = function () {
        var mask = this.replaceAll(this.editMask, "\\[", "�");
        mask = this.replaceAll(mask, "\\]", "�");
        this._validateArray = new Array();
        var retval = new Array();
        var nestedcount = 0;
        var startpos = 0;
        for(var t = 0; t < mask.length; t++) {
            var item = mask.substring(startpos, t);
            var charpos = mask.substring(t, t + 1);
            if (charpos == '[') {
                nestedcount++;
                if (nestedcount == 1) {
                    this.processConsecutive(this.replaceAll(this.replaceAll(item, "�", "["), "�", "]"), retval);
                    startpos = t + 1;
                }
            }
            if (charpos == ']') {
                nestedcount--;
                if (nestedcount == 0) {
                    var val = this.processGroup(this.replaceAll(this.replaceAll(item, "�", "["), "�", "]"), retval);
                    if (val != "") {
                        retval.push(val);
                    }
                    startpos = t + 1;
                }
                if (nestedcount < 0) {
                    nestedcount = 0;
                }
            }
        }
        if (startpos < mask.length) {
            this.processConsecutive(this.replaceAll(this.replaceAll(mask.substring(startpos, mask.length), "�", "["), "�", "]"), retval);
        }
        this._maskArray = retval;
    };
    textboxEditMask.prototype.processGroup = function (val, retval) {
        if (val.substring(0, 1) == '*') {
            var l = retval.length;
            this._validateArray.length = l;
            this._validateArray[l] = this.replaceAll(val.substring(1, val.length), "#", "\\d");
            return "";
        }
        val = this.replaceAll(val, "\\-", "�");
        var pos = val.indexOf("-");
        if (pos >= 0) {
            var r = "";
            for(var t = (val.charCodeAt(pos - 1) + 1); t < (val.charCodeAt(pos + 1)); t++) {
                r = r + String.fromCharCode(t);
            }
            val = this.replaceAll(val, "-", r);
        }
        return this.replaceAll(val, "�", "\\-");
    };
    textboxEditMask.prototype.processConsecutive = function (curitem, retval) {
        var i;
        var l;
        for(i = 0; i < curitem.length; i++) {
            var single = curitem.substring(i, i + 1);
            if (single == "\\") {
                single = curitem.substring(i, i + 2);
                i++;
            }
            switch(single) {
                case '*':
                    l = retval.length;
                    this._validateArray.length = l;
                    this._validateArray[l] = ".novalidation";
                    break;
                case '{':
                    l = curitem.indexOf('}', i);
                    if (l == -1) {
                        retval.push(single);
                    } else {
                        var nbrText = curitem.substring(i + 1, l);
                        var n = Number(this.replaceAll(nbrText, "?", ""));
                        var isOptional = (nbrText.indexOf("?") > -1);
                        if (isOptional == true) {
                            retval[retval.length - 1] = retval[retval.length - 1] + "�";
                        }
                        var lastval = retval[retval.length - 1];
                        for(var t = 1; t < n; t++) {
                            retval.push(lastval);
                        }
                        i = l;
                    }
                    break;
                default:
                    retval.push(single);
            }
        }
        return retval;
    };
    textboxEditMask.prototype.lookupMask = function (pos) {
        if (this._maskArray.length == pos) {
            return "";
        }
        return this._maskArray[pos];
    };
    textboxEditMask.prototype.processNonPrintableKeyPress = function () {
        switch(event.keyCode) {
            case 36:
                event.returnValue = false;
                this.moveToStart();
                this.positionAtNextEditable();
                break;
            case 37:
                event.returnValue = false;
                this.moveBackward();
                this.positionAtPreviousEditable();
                break;
            case 39:
                event.returnValue = false;
                this.moveForward();
                this.positionAtNextEditable();
                break;
            case 35:
                event.returnValue = false;
                this.moveToEnd();
                this.positionAtNextEditable();
                break;
        }
    };
    textboxEditMask.prototype.findPrevLiteralPos = function (pos) {
        for(var t = pos; t > 0; --t) {
            if (this.isPositionALiteral(t) == true) {
                return t;
            }
        }
        return -1;
    };
    textboxEditMask.prototype.findNextLiteralPos = function (pos) {
        for(var t = pos; t < this.inputValue().length; t++) {
            if (this.isPositionALiteral(t) == true) {
                return t;
            }
        }
        return -1;
    };
    textboxEditMask.prototype.isPositionALiteral = function (pos) {
        var mask = this.lookupMask(pos);
        switch(mask.substring(0, 1)) {
            case '^':
            case '!':
            case '#':
            case '&':
            case '>':
            case '<':
            case '@':
            case '_':
                return false;
                break;
            default:
                return true;
        }
    };
    textboxEditMask.prototype.isKeyCodeGoodAtPosition = function (kc, pos) {
        var mask = this.lookupMask(pos);
        var retval = false;
        for(var t = 0; t < mask.length; t++) {
            var chr = mask.substring(t, t + 1);
            switch(chr) {
                case '#':
                    if (this.isKeyNumeric(kc)) {
                        retval = true;
                    }
                    break;
                case '&':
                case '>':
                case '<':
                    if (this.isKeyAlpha(kc)) {
                        retval = true;
                    }
                    break;
                case '@':
                case '^':
                case '!':
                    if (this.isKeyAlpha(kc) || this.isKeyNumeric(kc)) {
                        retval = true;
                    }
                    break;
                case '_':
                    retval = true;
                    break;
                default:
                    if (chr == '\\') {
                        t++;
                        chr = mask.substring(t, t + 1);
                    }
                    if (this.toLowercaseKey(chr.charCodeAt(0)) == this.toLowercaseKey(kc)) {
                        retval = true;
                    }
            }
            if (retval == true) {
                break;
            }
        }
        return retval;
    };
    textboxEditMask.prototype.keyCodeToASCII = function (e) {
        if (e == null) {
            e = event;
        }
        var rv = e.keyCode;
        if (e.type == "keydown") {
            if (e.shiftKey == false) {
                if (rv >= 65 && rv <= 90) {
                    return rv + 32;
                }
                if (rv >= 48 && rv <= 57) {
                    return rv;
                }
                if (rv >= 48 && rv <= 57) {
                    return rv;
                }
                if (rv >= 96 && rv <= 106) {
                    return rv - 48;
                }
                switch(rv) {
                    case 192:
                        return 96;
                        break;
                    case 189:
                        return 45;
                        break;
                    case 187:
                        return 61;
                        break;
                    case 219:
                        return 91;
                        break;
                    case 221:
                        return 93;
                        break;
                    case 220:
                        return 92;
                        break;
                    case 186:
                        return 59;
                        break;
                    case 222:
                        return 39;
                        break;
                    case 188:
                        return 44;
                        break;
                    case 190:
                        return 46;
                        break;
                    case 191:
                        return 47;
                        break;
                }
            } else {
                if (rv >= 65 && rv <= 90) {
                    return rv;
                }
                switch(rv) {
                    case 48:
                        return 41;
                        break;
                    case 49:
                        return 33;
                        break;
                    case 50:
                        return 64;
                        break;
                    case 51:
                        return 35;
                        break;
                    case 52:
                        return 36;
                        break;
                    case 53:
                        return 37;
                        break;
                    case 54:
                        return 94;
                        break;
                    case 55:
                        return 38;
                        break;
                    case 56:
                        return 42;
                        break;
                    case 57:
                        return 40;
                        break;
                    case 192:
                        return 126;
                        break;
                    case 189:
                        return 95;
                        break;
                    case 187:
                        return 43;
                        break;
                    case 219:
                        return 123;
                        break;
                    case 221:
                        return 125;
                        break;
                    case 220:
                        return 124;
                        break;
                    case 186:
                        return 58;
                        break;
                    case 222:
                        return 34;
                        break;
                    case 188:
                        return 60;
                        break;
                    case 190:
                        return 62;
                        break;
                    case 191:
                        return 63;
                        break;
                }
            }
            switch(rv) {
                case 106:
                    return 42;
                    break;
                case 107:
                    return 43;
                    break;
                case 109:
                    return 45;
                    break;
                case 110:
                    return 46;
                    break;
                case 111:
                    return 47;
                    break;
            }
        }
        return rv;
    };
    textboxEditMask.prototype.processPrintableKeyPress = function () {
        var kc = this.keyCodeToASCII();
        if (kc == 8) {
            return this.processBackspace();
        }
        if (kc == 46) {
            return this.processDelete();
        }
        if (this.positionAtNextEditable() == false) {
            event.returnValue = false;
            return;
        }
        var pos = this.caretPos();
        event.returnValue = this.isKeyCodeGoodAtPosition(kc, pos);
        if (event.returnValue == true) {
            this.moveTo(pos, 1);
        } else {
            var next = this.findNextLiteralPos(pos);
            if (next == -1) {
                return;
            }
            var mask = this.lookupMask(next);
            if (mask.substring(0, 1) == '\\') {
                mask = mask.substring(1, 2);
            }
            if (mask.charCodeAt(0) != kc) {
                return;
            }
            var prev = this.findPrevLiteralPos(pos);
            var newval = "";
            var newstart = next - pos + prev + 1;
            for(var t = prev + 1; t < next; t++) {
                if (t < newstart) {
                    newval += this.getDefaultInputForPosition(t);
                } else {
                    var k = this.inputValue().substring(t - newstart, t - newstart + 1);
                    if (!this.isKeyCodeGoodAtPosition(k.charCodeAt(0), t)) {
                        return;
                    }
                    newval += k;
                }
            }
            this.inputValue(this.inputValue().substring(0, prev + 1) + newval + this.inputValue().substring(next, this.inputValue().length));
            this.moveTo(prev + newval.length + 1);
        }
    };
    textboxEditMask.prototype.processDelete = function () {
        event.returnValue = false;
    };
    textboxEditMask.prototype.processBackspace = function () {
        event.returnValue = false;
        var pos = this.caretPos();
        if (this.isInputAllowed(this._maskArray[pos]) == false) {
            this.positionAtPreviousEditable();
        }
        this.moveBackward();
        pos = this.caretPos();
        var msk = this.getDefaultMaskForPosition(pos);
        this.placeChar(msk, true);
        this.positionAtPreviousEditable();
    };
    textboxEditMask.prototype.replaceAll = function (text, oldVal, newVal) {
        var i = text.indexOf(oldVal);
        while(i != -1) {
            text = text.replace(oldVal, newVal);
            i = text.indexOf(oldVal);
        }
        return text;
    };
    return textboxEditMask;
})();
var editMaskPatterns = (function () {
    function editMaskPatterns() { }
    editMaskPatterns.time12Hour = "[ 01]#[*[ 0][1-9]|1[0-2]]:[0-5]# [AP]M";
    editMaskPatterns.time24Hour = "[ 012]#[*[ 01]#|2[0-3]]:[0-5]#";
    editMaskPatterns.phone = "(###) ###-####";
    editMaskPatterns.socialSecurity = "###-##-####";
    editMaskPatterns.dateMMDDYYYY = "[ 01]#[*[ 0]#|1[0-2]]/*[ 0123]#[*[ 012]#|3[01]]/*[12]#[*19|2[01]]##";
    editMaskPatterns.ipV6 = "[#A-F]{4}:[#A-F]{4}:[#A-F]{4}:[#A-F]{4}:[#A-F]{4}:[#A-F]{4}:[#A-F]{4}:[#A-F]{4}";
    editMaskPatterns.temperature = "[ #]{3}[*###| ##|  #].# [CFK] ";
    return editMaskPatterns;
})();
