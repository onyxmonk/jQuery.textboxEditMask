interface editMaskPatterns {
	time12Hour: string;
	time24Hour: string;
	phone: string;
	socialSecurity: string;
	dateMMDDYYYY: string;
	ipV6: string;
	temperature: string;
}
declare class textboxEditMask {
    caretPos(): number;
    inputValue(text?: string): string;
    setMask(mask: string);
}

interface JQuery{ setMask(text: string, defaultText?: string, handler?: (textboxEditMaskObject: textboxEditMask) => any): JQuery; }
