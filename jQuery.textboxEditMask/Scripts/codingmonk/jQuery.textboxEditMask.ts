/// <reference path="../typings/jquery/jquery.d.ts" />
/*------------------------------------------------------------------------------------------------
 CodingMonk.TextBoxEditMask.ts
 Copyright 2005 - 2013: CodingMonk, LLC
 www.CodingMonk.com
 WebMaster@CodingMonk.com
-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
 LICENSE:
 The Typescript file and its resulting javascript file are licensed under the Creative Commons 
  Attribution-ShareAlike License (http://creativecommons.org/licenses/by-sa/2.5/).
 
 In summary: You are free to use, alter, transform, or build upon this source code for 
 commercial or personal use at no cost, but you must credit CodingMonk, LLC in the SOURCE 
 FORM of your derived work and may distribute the source only under a license identical to this
 one.  Note that the ShareAlike clause does not affect the way in which you distribute the 
 COMPILED FORM of works built upon this software. 

 To vary any of the terms of this license you must seek permission from the copyright 
 holder CodingMonk, LLC.
-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
 DESCRIPTION:
 This file provides a mechanism for creating a dynamic masked-edit box.  

 This is a TypeScript port of the original module JACLTextBoxEditMask, which was part of the 
 Javascript Application Code Library (JACL). It has been refactored to leverage modern web 
 technologies which came about after its inception (JQuery), support modern browsers , and 
 include enhancements to its usability.  

 It supports a rich notation for defining editmask expressions, validation, and events.  The 
 notation is documented at the following URL:

	http://www.codingmonk.com/archive/2009/08/09/codingmonk-edit-mask-notation.aspx

 This plugin depends on JQuery which must be included first. 

 Examples:
	The simplest use of this module is to declare an attribute named "editMask" on an input box. 
	For instance:

		<input id="phone" editMask="(###) ###-####"  />		
	
	No addtional calls need be made for this, simply include the file after including the 
	JQuery library and the above will become an edit mask.

-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
 HISTORY:
  2013.06.02 Jim Fisher     Port from the original JACL modules.
  2005.11.26 Jim Fisher     Initial creation
------------------------------------------------------------------------------------------------*/

interface JQuery{ setMask(text: string, defaultText?:string, handler?: (textboxEditMaskObject: textboxEditMask) => any): JQuery; }

jQuery.fn.outerHTML = function (s) {
	return (s)
		? this.before(s).remove()
		: jQuery("&lt;p&gt;").append(this.eq(0).clone()).html();
}

$(document).ready(() => {
    $(":input[editMask]").each(function () {
		var em = $(this).attr("editMask");
        var dt = $(this).attr("defaultEditMask");
        $(this).setMask(em, dt);
    } );
} );

$.fn.extend({
    setMask: function (mask: string, defaultText?:string, handler?: (textboxEditMaskObject: textboxEditMask) => any) {
			var em: textboxEditMask;
            var tb = $(this);

            if (tb.data("editMask") != null) em = tb.data("editMask");

            if (mask == null || mask == "") {
                if (em != null) {
                    tb.data("editMask",null);
                }
                return;
            }

            if (em == null) {
                em = new textboxEditMask(this, mask, defaultText, handler);
                tb.data("editMask", em);
            } else {
                em.editMask = mask;
            }
    }, 
});

$.extend({
    getMaskObject: function (): textboxEditMask {
        var tb = $(this);
        if (tb == null) return null;
        return tb.data("editMask");
    }
});

class textboxEditMask {
	_maskArray: string[];
    _validateArray: string[];
    _wildcards = "#&@_><!^";

    constructor(public textBox, public editMask: string, public defaultText?:string, public validationHandler?: (textboxEditMaskObject: textboxEditMask) => any) {
        this.init();
    }
	processKeyPress() {
		if (this.isKeyNonprintable(event.keyCode) == true)
			this.processNonPrintableKeyPress();
		else
			this.processPrintableKeyPress();
	}
    private init() {
        var tb = $(this.textBox);
		tb.keydown(() => { this.processKeyPress(); } );
		tb.keypress(() => { this.fixCharacterCase(); } );
        tb.keyup(() => {
            if (event.keyCode != 8 && event.keyCode != 37)
				this.positionAtNextEditable();
				this.validate();
        } );
		
        this.setMask(this.editMask);
    }
    
    caretPos():number {
        var retval = 0;
		if (this.textBox.selectionStart !=null) {
			retval = this.textBox.selectionStart;
		}
		else if (document.selection) {
			var r = document.selection.createRange().duplicate();
			if (r.parentElement() != this.textBox) {
				$(this.textBox).focus();
				r = document.selection.createRange().duplicate();
			}
			while (r.move("character", -1) != 0) retval++;
		}
		
		return retval;
	}
    inputValue(text?: string):string {
        if (text != null)
            $(this.textBox).val(text);
        else
            return $(this.textBox).val();
    }
    isInputAllowed(mask: string) {
        if (mask == null) return false;
        if (mask.length > 2) return true; //--must be a list, so yes we can take input in this position
        var c = mask.substring(0, 1); //--first character in a set of 1 or 2 characters
        if (c == '\\') return false; //--a single literal; so no, we can't edit this position
        if (mask.length == 2) return true; //--two characters, so yes...
        //--guaranteed to have one and only one character...
        if (this._wildcards.indexOf(c) > -1) return true; //--wildcard characters
        return false; //--must be an unescaped literal
    }
    moveForward() {
		if (this.caretPos() == this.inputValue().length) return false;
		this.moveTo(this.caretPos() + 1);
		return true;
    }
    moveBackward() {
		if (this.caretPos() == 0) return false;
		this.moveTo(this.caretPos() - 1);
		return true;
    }
    moveToStart() { this.moveTo(0); }
    moveToEnd() { this.moveTo(999999); }
    moveTo(pos:number, posLength?:number) {
		if (pos < 0) pos = 0;
		if (pos > this.inputValue().length) pos = this.inputValue().length;
		if (posLength == null || posLength < 0) posLength = 0;
		if (posLength + pos > this.inputValue().length) posLength = this.inputValue().length - pos;
		
		if (this.textBox.setSelectionRange) {
			this.textBox.setSelectionRange(pos, pos + posLength);
		}
		else {
			var r = document.selection.createRange().duplicate();
			r.move("character", pos - this.caretPos());
			r.moveEnd("character", posLength);
			r.select();
		}
    }
	positionAtPreviousEditable() {
		return this._positionAtEditable(true);
	}
	positionAtNextEditable() {
		return this._positionAtEditable(false);
	}
	_positionAtEditable(back: boolean) {
        var offset = 0;
        if (back == true) offset = -1;
        var pos = this.caretPos()+offset;
		if (pos != this.validateThroughPos(pos)) return;
        var msk = this.lookupMask(pos);
        if (msk == "") return false;
		
		while (!this.isInputAllowed(msk)) {
			if (back == true) {
				if (this.moveBackward() == false) return false;
				this.placeChar(this.getDefaultMaskForPosition(pos), true);
            } else {
				this.placeChar(msk, true);
				if (this.moveForward() == false)
                    return false;
                else {
                    if (this.caretPos() == this.inputValue().length) this.validateThroughPos(this.caretPos());
                }
            }
            pos = this.caretPos() + offset;
            msk = this.lookupMask(pos);
        }
		return true;
    }
    validate() {
		if (this.isValidAndComplete() == true) {
			$(this.textBox).addClass("editMaskValidated");
			$(this.textBox).removeClass("editMaskNotValidated");
			return true;
		}else{
			$(this.textBox).removeClass("editMaskValidated");
			$(this.textBox).addClass("editMaskNotValidated");
			return false;
		}

	}
	isValidAndComplete() : boolean{
		var retval:boolean=true;  
		var iv=this.inputValue();

		if(this.validateThroughPos(-1, false)!=iv.length){
			retval=false;
		}else{ 
			for(var t=0;t<iv.length && retval == true;t++){
				retval = this.isKeyCodeGoodAtPosition(iv.substring(t,t+1).charCodeAt(0),t);
			}
		}
		return retval;
	}
	validateThroughPos(pos:number, highlight:boolean=true) {

        if (this._validateArray == null) return pos;
        if (pos > -1) { //--assuming we are not forcing validation of the entire pattern...
            if (this._validateArray.length <= pos) return pos; //--and not at a validation point then return with no changes
            if (this._validateArray[pos] == null) return pos;
        }

        if (pos == -1) pos = this.inputValue().length; //--we ARE forcing validation...
        var startpos = 0;
        var max = (pos > this._validateArray.length) ? this._validateArray.length : pos;

        for (var t = 0; t <= max; t++) {
            if (this._validateArray[t] != null) {  //--cycle through all the validation patterns up to this point
                if (this._validateArray[t] != '.novalidation') { //--validate if something to validate against...
                    var validationvalue = this._validateArray[t];
					var stringtovalidate = this.inputValue().substring(startpos, t);
					
                    var re = new RegExp(validationvalue);
                    if (re.test(stringtovalidate) == false) {
						if (highlight == true) this.moveTo(startpos, t - startpos);
                        return startpos; //--failed validation? move cursor for user to correct
                    }
                }
                startpos = t;
            }
        }
        if (this.validationHandler != null) this.validationHandler(this);
        return pos;
    }
    setMask(mask: string) {
        this.editMask = mask;
        this.parseMask();

        if (this.inputValue() == "")
            this.inputValue(this.getDefaultMask());
		this.validate();
    }
    getDefaultMask() {
        var retval = "";
        if (this._maskArray.length > 0) {
            for (var pos = 0; pos < this._maskArray.length; pos++) {
                retval += this.getDefaultMaskForPosition(pos);
            }
        }
        
        return retval;
    }
	getDefaultMaskForPosition(pos: number) {
		var retval: string;
		if (this.defaultText == null || this.defaultText.length < pos)
			retval = this.getDefaultMaskForToken(this._maskArray[pos]);
		else
			retval = this.defaultText.substr(pos, 1);
		return retval;
	}
	getDefaultMaskForToken(s: string) {
		if (s.length == 1 && this._wildcards.indexOf(s) != -1) { //--handle single wildcards
            if (s == "#") return "0";
            return " ";
        }
        if (s.length == 1 || (s.length == 2 && s.substring(0, 1) == '\\')) { //--handle any other single characters (literals)
            s=this.replaceAll(s,"\\", "");
            return s;
        }
        //--must be a grouping
        //if (s.indexOf("�") != -1) return " "; //--if a space is contained in that grouping then prefer that
		if (s.indexOf(" ") != -1) return " "; //--if a space is contained in that grouping then prefer that
		return s.substring(0, 1);
    }
	//used when filling in positions following an alignment.  This is actual default input, which is subtley different that default text
	getDefaultInputForToken(s: string) {
        if (s == "#") return " ";
		return this.getDefaultMaskForToken(s);
	}
	
	getDefaultInputForPosition(pos: number) {
		if (this.defaultText == null || this.defaultText.length < pos)
			return this.getDefaultInputForToken(this._maskArray[pos]);
		
		return this.getDefaultMaskForPosition(pos);
	}


	//#region Boolean character tests
	isKeyUppercase(c) { return (c >= 65 && c <= 90); }
    isKeyLowercase(c) { return (c >= 97 && c <= 122); }
    isKeyAlpha(c) { return (this.isKeyUppercase(c) || this.isKeyLowercase(c)); }
    isKeyNumeric(c) { return (c >= 0x30 && c <= 0x39); }
    isKeyNonprintable(c) {
        if (c == 16) return true; //--shift
        if (c >= 35 && c <= 40) return true;
        if (c == 9) return true;
        return false;
	}

	//#endregion 

	//#region character keycode conversions
	toLowercaseKey(c) { if (this.isKeyAlpha(c) && !this.isKeyLowercase(c)) return (c + 32); return c; }
    toUppercaseKey(c) { if (this.isKeyAlpha(c) && !this.isKeyUppercase(c)) return (c - 32); return c; }
    toCharFromKey(code) { return decodeURI('%' + code.toString(16)); }
	//#endregion

	//Convert the case of the current key stroke if necessary; actually prints it to the textbox and 
	//  suppresses the normal keystroke handling if case conversion is required, since changing the character
	//  on the event object itself is not handled by all browsers.
	fixCharacterCase() {
        var pos = this.caretPos(); //--get the position of the caret
        var mask = this.lookupMask(pos); //--and the associated mask for this position
        var good = false; //--we'll assume we have to change case unless a match is found
        for (var t = 0; t < mask.length; t++) {
            var chr = mask.substring(t, t + 1);
            switch (chr) {
                //--nothing to do for these, if it passed the onKeyDown check then we are good to go
                case '_': //anycharacter
                case '@': //alphanumeric
                case '&': //alpha
                case '#': //numberic
                    return; //--any of the above wild cards will allow mixed case so we're good...
                    break;
                case '>':
                    if (this.isKeyUppercase(event.keyCode)) good = true; //--is an upper case character, so we've found a match...
                    break;
                case '<':
                    if (this.isKeyLowercase(event.keyCode)) good = true; //--is a lower case character, so we've found a match...
                    break;
                case '!':
                    if (this.isKeyNumeric(event.keyCode) || this.isKeyLowercase(event.keyCode)) good = true; //--is a lower case character, so we've found a match...
                    break;
                case '^':
                    if (this.isKeyNumeric(event.keyCode) || this.isKeyUppercase(event.keyCode)) good = true; //--is a lower case character, so we've found a match...
                    break;
                default: //--matching against literals...
                    if (chr == '\\') { //--an escaped literal; so get the actual character
                        t++;
                        chr = mask.substring(t, t + 1);
                    }
					if (chr.charCodeAt(0) == event.keyCode) {
						good = true;
					}
            }
            if (good == true) return;
        }
		//--If we've fallen through to here then we were not able to match this character to the mask. 
		//--Since we've already validated the character to the key press in the onkeydown event, we 
		//--know that this must be an issue with case. Just translate the case and move on.

		var key = event.keyCode;
		if (!this.isKeyUppercase(key))
            key -= 32;
        else
			key += 32;
		this.placeKey(key);
	}
	
	//actual place a character at the current position in the textbox, supressing normal keystroke processing
	placeKey(keyCode) {
		event.returnValue = false;
		this.placeChar(this.toCharFromKey(keyCode));
	}
	//actual place a character at the current position in the textbox
	placeChar(char:string, suppressCaretMovement?:boolean) {
		var offset = 1;
		if (suppressCaretMovement == true) offset = 0;
		var charpos = this.caretPos();
		this.inputValue(this.inputValue().substr(0, this.caretPos()) + char + this.inputValue().substr(this.caretPos() + 1, 99999));
		this.moveTo(charpos+offset);
	}
	
	//#region parse edit mask

	//take an edit mask and breaking it up into something more useable, by expanding groups, picking out 
	//  validation expressions, and organizing all parsings into the _validateArray and _maskArray variables.
	parseMask() {
		var mask = this.replaceAll(this.editMask, "\\[", "�");
		mask = this.replaceAll(mask, "\\]", "�"); //--eliminate literals that would confuse our grouping step
        this._validateArray = new Array();
	    var retval:string[]=new Array();
	    var nestedcount=0;
	    var startpos=0;
	    for(var t=0;t<mask.length;t++){
		    var item=mask.substring(startpos,t);
		    var charpos=mask.substring(t,t+1);
		    if(charpos=='[') { //--if a new (outer) grouping
			    nestedcount++;
			    if(nestedcount==1){
				    this.processConsecutive(this.replaceAll(this.replaceAll(item, "�","["), "�","]"),retval);
				    startpos=t+1;
			    }
		    }
		    if(charpos==']'){ //--if closing the outer grouping
			    nestedcount--;
			    if(nestedcount==0){
					var val = this.processGroup(this.replaceAll(this.replaceAll(item, "�","["), "�","]"),retval);
				    if(val!="")retval.push(val); //--handle the first as a list (restoring elliminated literals)
				    startpos=t+1;
			    }
			    if(nestedcount<0) nestedcount=0;
		    }
	    }
	    if(startpos<mask.length) this.processConsecutive(this.replaceAll(this.replaceAll(mask.substring(startpos,mask.length), "�","["), "�","]"),retval);
        this._maskArray = retval;
    }
	
	//process the characters contained within a [grouping]
	processGroup(val: string, retval: string[]) {
		//if this is a validation expression, then do this...
		if (val.substring(0, 1) == '*') {
            var l = retval.length;
            this._validateArray.length = l;
			this._validateArray[l] = this.replaceAll(val.substring(1, val.length), "#", "\\d");
            return "";
        }
		
		//otherwise, this is a grouping... 
		val = this.replaceAll(val, "\\-", "�"); //temporarily hide escaped dash literals
		
		//look for a range and expand it....
		var pos = val.indexOf("-"); //TODO: this looks like it only handles one range as written.  Validate this
		if (pos >= 0) { 
            var r = "";
            for (var t = (val.charCodeAt(pos - 1) + 1); t < (val.charCodeAt(pos + 1)); t++) r = r + String.fromCharCode(t);
			val = this.replaceAll(val, "-", r);
        }
		return this.replaceAll(val, "�", "\\-");
    }
	// process individual, non-grouped characters
	processConsecutive(curitem: string, retval: string[]) {
        var i;
        var l;
        for (i = 0; i < curitem.length; i++) {
            var single = curitem.substring(i, i + 1);
            if (single == "\\") { //--if this is a literal, then include the next character too
                single = curitem.substring(i, i + 2);
                i++;
            }
        
            switch (single) {
                case '*':
                    l = retval.length;
                    this._validateArray.length = l;
                    this._validateArray[l] = ".novalidation";
                    break;
                case '{': //repeat last token?
                    l = curitem.indexOf('}', i);
                    if (l == -1)
                        retval.push(single);
                    else {
                        var nbrText = curitem.substring(i + 1, l);
						var n = Number(this.replaceAll(nbrText, "?",""));
                        var isOptional=(nbrText.indexOf("?")>-1);
                        if(isOptional == true){
							retval[retval.length - 1]=retval[retval.length - 1]+"�";
						}
                        var lastval = retval[retval.length - 1];
                        for (var t = 1; t < n; t++) retval.push(lastval);
                        i = l;
                    }
                    break;
                default:
                    retval.push(single);
            }
        }
        return retval;
	}
	//#endregion

    lookupMask(pos:number) {
        if (this._maskArray.length == pos) return "";
        return this._maskArray[pos];
    }

    processNonPrintableKeyPress(){
        switch (event.keyCode) {
            case 36: //home
                event.returnValue = false;
                this.moveToStart();
                this.positionAtNextEditable();
                break;
            case 37: //left arrow
                event.returnValue = false;
                this.moveBackward();
                this.positionAtPreviousEditable();
                break;
            case 39: //right arrow
                event.returnValue = false;
                this.moveForward();
                this.positionAtNextEditable();
                break;
            case 35: //end
                event.returnValue = false;
                this.moveToEnd(); //--all the way forward
                this.positionAtNextEditable();
                break;
        }
    }
    findPrevLiteralPos(pos) {
        for (var t = pos; t > 0; --t) if (this.isPositionALiteral(t) == true) return t;
        return -1;
    }
    findNextLiteralPos(pos) {
        for (var t = pos; t < this.inputValue().length; t++) if (this.isPositionALiteral(t) == true) return t;
        return -1;
    }
    isPositionALiteral(pos) {
        var mask = this.lookupMask(pos);
        switch (mask.substring(0, 1)) {
            case '^':
            case '!':
            case '#':
            case '&':
            case '>':
            case '<':
            case '@':
            case '_': return false;
                break;
            default: return true;
        }
    }
    isKeyCodeGoodAtPosition(kc, pos) {
        var mask = this.lookupMask(pos); //--and the associated mask for this position
        var retval = false; //--default to suppress, until we find it in the list

        for (var t = 0; t < mask.length; t++) {
            var chr = mask.substring(t, t + 1);
        
            switch (chr) {
                case '#': //number
                    if (this.isKeyNumeric(kc)) retval = true;
                    break;
                case '&': //alpha
                case '>':
                case '<':
                    if (this.isKeyAlpha(kc)) retval = true;
                    break;
                case '@': //alphanumeric
                case '^': //alphanumeric
                case '!': //alphanumeric
                    if (this.isKeyAlpha(kc) || this.isKeyNumeric(kc)) retval = true;
                    break;
                case '_': retval = true;
                    break;
                default: //--literals
                    if (chr == '\\') { //--an escaped literal; so get the actual character
                        t++;
                        chr = mask.substring(t, t + 1);
                    }
                    if (this.toLowercaseKey(chr.charCodeAt(0)) == this.toLowercaseKey(kc)) retval = true;
            }
            if (retval == true) break; //--we found an acceptable match, so lets skip the rest of this...
        }
        return retval;
    }
    keyCodeToASCII(e?) {
        if (e == null) e = event;
        var rv = e.keyCode;
        if (e.type == "keydown") { //--if anything other than keydown, then already have an ascii character... 
            if (e.shiftKey == false) { //--unshifted
                if (rv >= 65 && rv <= 90) return rv + 32;	//--alpha (convert to lowercase)
                if (rv >= 48 && rv <= 57) return rv;		//--numbers match
                if (rv >= 48 && rv <= 57) return rv;		//--numbers match
                if (rv >= 96 && rv <= 106) return rv - 48; //--keypad numbers
            
                switch (rv) {
                    case 192: return 96; break; //-- `
                    case 189: return 45; break; //-- -
                    case 187: return 61; break; //-- =
                    case 219: return 91; break; //-- [
                    case 221: return 93; break; //-- ]
                    case 220: return 92; break; //-- \
                    case 186: return 59; break; //-- ;
                    case 222: return 39; break; //-- '
                    case 188: return 44; break; //-- ,
                    case 190: return 46; break; //-- .
                    case 191: return 47; break; //-- /
                }
        
            } else { //--shifted
                if (rv >= 65 && rv <= 90) return rv;	//--alpha match
                switch (rv) {
                    case 48: return 41; break; //-- )
                    case 49: return 33; break; //-- !
                    case 50: return 64; break; //-- @
                    case 51: return 35; break; //-- #
                    case 52: return 36; break; //-- $
                    case 53: return 37; break; //-- %
                    case 54: return 94; break; //-- ^
                    case 55: return 38; break; //-- &
                    case 56: return 42; break; //-- *
                    case 57: return 40; break; //-- (
                    case 192: return 126; break; //-- ~
                    case 189: return 95; break; //-- _
                    case 187: return 43; break; //-- +
                    case 219: return 123; break; //-- {
                    case 221: return 125; break; //-- }
                    case 220: return 124; break; //-- |
                    case 186: return 58; break; //-- :
                    case 222: return 34; break; //-- "
                    case 188: return 60; break; //-- <
                    case 190: return 62; break; //-- >
                    case 191: return 63; break; //-- ?
                }
            }
            switch (rv) {
                case 106: return 42; break; //-- (numpad) *
                case 107: return 43; break; //-- (numpad) +
                case 109: return 45; break; //-- (numpad) -
                case 110: return 46; break; //-- (numpad) .
                case 111: return 47; break; //-- (numpad) /
            }
        }
        return rv;
    }
    processPrintableKeyPress() {
        //--reposition to a point where we can really take input
        var kc = this.keyCodeToASCII();
        if (kc == 8) return this.processBackspace();
        if (kc == 46) return this.processDelete();
        if (this.positionAtNextEditable() == false) { //--past the last editable field
            event.returnValue = false;
            return;
        }

		var pos = this.caretPos(); //--get the position of the caret
        event.returnValue = this.isKeyCodeGoodAtPosition(kc, pos);
        if (event.returnValue == true) {//--we've found a match
			this.moveTo(pos, 1); //don't allow mass replace
        } else {//not a match, so lets see if it matches the next literal and try adjust the content
			var next = this.findNextLiteralPos(pos);
            if (next == -1) return; //--no next literal to match against, so let's ignore it
            var mask = this.lookupMask(next); //get the literal
            if (mask.substring(0, 1) == '\\') mask = mask.substring(1, 2); //possibly deciphering it
            if (mask.charCodeAt(0) != kc) return; //--doesn't match, so ignore it
            var prev = this.findPrevLiteralPos(pos);
            //we now have a range to try and reposition...
            var newval = "";
            var newstart = next - pos + prev + 1;
            for (var t = prev + 1; t < next; t++) {
                if (t < newstart) newval += this.getDefaultInputForPosition(t);
                else {
                    var k = this.inputValue().substring(t - newstart, t - newstart + 1);
                    if (!this.isKeyCodeGoodAtPosition(k.charCodeAt(0), t)) return;
                    newval += k;
                }
            }
            this.inputValue(this.inputValue().substring(0, prev + 1) + newval + this.inputValue().substring(next, this.inputValue().length));
            this.moveTo(prev + newval.length + 1);
        }
    }
    processDelete() {
        event.returnValue = false;
    }
    processBackspace() {
        event.returnValue = false; //--suppress the default handling of this, since we will handle it all here
		var pos = this.caretPos(); //--get the position of the caret
		//if(pos==this.inputValue().length) this.moveBackward();
		//pos = this.caretPos(); //--get the position of the caret

		if (this.isInputAllowed(this._maskArray[pos]) == false) {
			this.positionAtPreviousEditable(); //--skipping all non-editable stuff
		}
		this.moveBackward();
		pos = this.caretPos(); //--get the position of the caret
		var msk = this.getDefaultMaskForPosition(pos);
		this.placeChar(msk, true);
		this.positionAtPreviousEditable(); //--skipping all non-editable stuff
	}
	private replaceAll(text: string, oldVal: string, newVal: string):string {
		var i = text.indexOf(oldVal);
		while (i != -1) {
			text = text.replace(oldVal, newVal)
			i = text.indexOf(oldVal);
		}
		return text;
	}

}

class editMaskPatterns {
	public static time12Hour = "[ 01]#[*[ 0][1-9]|1[0-2]]:[0-5]# [AP]M";
	public static time24Hour = "[ 012]#[*[ 01]#|2[0-3]]:[0-5]#";
	public static phone = "(###) ###-####";
	public static socialSecurity = "###-##-####";
	public static dateMMDDYYYY = "[ 01]#[*[ 0]#|1[0-2]]/*[ 0123]#[*[ 012]#|3[01]]/*[12]#[*19|2[01]]##";
	public static ipV6 = "[#A-F]{4}:[#A-F]{4}:[#A-F]{4}:[#A-F]{4}:[#A-F]{4}:[#A-F]{4}:[#A-F]{4}:[#A-F]{4}";
	public static temperature = "[ #]{3}[*###| ##|  #].# [CFK] ";
}

