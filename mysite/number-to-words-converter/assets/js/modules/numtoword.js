// Number to Words Converter Engine
// Supports Indian System (Lakhs, Crores) & International System (Millions, Billions, Trillions)
// Handles Decimals, Currencies, and Cheque formats

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.numberToWords = factory().numberToWords;
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const UNITS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const INT_SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion', 'Quadrillion', 'Quintillion', 'Sextillion', 'Septillion'];

    // Convert integer < 1000 to words
    function convertThreeDigits(num) {
        let str = '';
        let hundred = Math.floor(num / 100);
        let remainder = num % 100;

        if (hundred > 0) {
            str += UNITS[hundred] + ' Hundred';
        }

        if (remainder > 0) {
            if (str !== '') str += ' and ';
            if (remainder < 20) {
                str += UNITS[remainder];
            } else {
                let ten = Math.floor(remainder / 10);
                let unit = remainder % 10;
                str += TENS[ten] + (unit > 0 ? '-' + UNITS[unit] : '');
            }
        }

        return str;
    }

    // Convert integer < 100 to words
    function convertTwoDigits(num) {
        if (num === 0) return '';
        if (num < 20) return UNITS[num];
        let ten = Math.floor(num / 10);
        let unit = num % 10;
        return TENS[ten] + (unit > 0 ? '-' + UNITS[unit] : '');
    }

    // International System Conversion
    function convertInternational(numStr) {
        if (numStr === '0') return 'Zero';
        
        let chunks = [];
        let tempStr = numStr;
        while (tempStr.length > 0) {
            chunks.push(tempStr.slice(Math.max(0, tempStr.length - 3)));
            tempStr = tempStr.slice(0, Math.max(0, tempStr.length - 3));
        }

        let words = [];
        for (let i = 0; i < chunks.length; i++) {
            let chunkNum = parseInt(chunks[i], 10);
            if (chunkNum > 0) {
                let chunkWords = convertThreeDigits(chunkNum);
                let scale = INT_SCALES[i] ? ' ' + INT_SCALES[i] : '';
                words.unshift(chunkWords + scale);
            }
        }

        return words.join(', ');
    }

    // Indian System Conversion
    function convertIndian(numStr) {
        if (numStr === '0') return 'Zero';

        let len = numStr.length;
        if (len <= 3) {
            return convertThreeDigits(parseInt(numStr, 10));
        }

        let last3 = parseInt(numStr.slice(-3), 10);
        let rest = numStr.slice(0, -3);

        let indianScales = ['Thousand', 'Lakh', 'Crore', 'Arab', 'Kharab', 'Nil', 'Padma', 'Shankh'];
        let groups = [];

        while (rest.length > 0) {
            groups.push(parseInt(rest.slice(Math.max(0, rest.length - 2)), 10));
            rest = rest.slice(0, Math.max(0, rest.length - 2));
        }

        let words = [];

        for (let i = groups.length - 1; i >= 0; i--) {
            let val = groups[i];
            if (val > 0) {
                let valWords = convertTwoDigits(val);
                let scale = indianScales[i] ? ' ' + indianScales[i] : '';
                words.push(valWords + scale);
            }
        }

        if (last3 > 0) {
            let last3Words = convertThreeDigits(last3);
            words.push(last3Words);
        }

        return words.join(', ');
    }

    // Format numbers into words with casing and currency options
    function numberToWords(rawInput, options = {}) {
        const {
            system = 'indian',      // 'indian' | 'international'
            currency = 'none',      // 'none' | 'INR' | 'USD' | 'EUR' | 'GBP'
            casing = 'title',       // 'title' | 'upper' | 'lower' | 'sentence'
            chequeFormat = false
        } = options;

        // Sanitize input
        let cleaned = String(rawInput).trim().replace(/,/g, '');
        if (!cleaned || isNaN(cleaned)) return { error: 'Please enter a valid number' };

        let isNegative = cleaned.startsWith('-');
        if (isNegative) cleaned = cleaned.substring(1);

        // Split integer and decimal parts
        let parts = cleaned.split('.');
        let intPart = parts[0].replace(/^0+/, '') || '0';
        let decPart = parts[1] || '';

        // Check digit length limits
        if (intPart.length > 21) {
            return { error: 'Number is too large (maximum 21 digits)' };
        }

        // Main conversion logic
        let intWords = system === 'indian' ? convertIndian(intPart) : convertInternational(intPart);

        // Currency Definitions
        const currencies = {
            INR: { main: ['Rupee', 'Rupees'], sub: ['Paise', 'Paise'] },
            USD: { main: ['Dollar', 'Dollars'], sub: ['Cent', 'Cents'] },
            EUR: { main: ['Euro', 'Euros'], sub: ['Cent', 'Cents'] },
            GBP: { main: ['Pound', 'Pounds'], sub: ['Pence', 'Pence'] }
        };

        let result = '';

        if (currency !== 'none' && currencies[currency]) {
            const curr = currencies[currency];
            let intNum = parseInt(intPart, 10);
            let mainUnit = intNum === 1 ? curr.main[0] : curr.main[1];

            result = `${intWords} ${mainUnit}`;

            if (decPart.length > 0) {
                let paddedDec = (decPart + '00').slice(0, 2);
                let decNum = parseInt(paddedDec, 10);
                if (decNum > 0) {
                    let subUnit = decNum === 1 ? curr.sub[0] : curr.sub[1];
                    let subWords = convertTwoDigits(decNum);
                    result += ` and ${subWords} ${subUnit}`;
                }
            }

            if (chequeFormat) {
                result += ' Only';
            }
        } else {
            result = intWords;
            if (decPart.length > 0) {
                let decimalDigits = decPart.split('').map(d => UNITS[parseInt(d, 10)] || 'Zero').join(' ');
                result += ` point ${decimalDigits}`;
            }
            if (chequeFormat) {
                result += ' Only';
            }
        }

        if (isNegative) {
            result = 'Negative ' + result;
        }

        // Apply casing
        result = applyCasing(result, casing);

        // Formatted digit representation with thousands/lakhs separators
        let formattedNumber = formatFormattedDigit(intPart, decPart, isNegative, system);

        return {
            words: result,
            formattedNumber: formattedNumber,
            integerWords: applyCasing(intWords, casing),
            system: system
        };
    }

    function applyCasing(text, casing) {
        if (!text) return '';
        switch (casing) {
            case 'upper':
                return text.toUpperCase();
            case 'lower':
                return text.toLowerCase();
            case 'sentence':
                return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            case 'title':
            default:
                return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
    }

    function formatFormattedDigit(intPart, decPart, isNegative, system) {
        let str = intPart;
        let formatted = '';

        if (system === 'indian') {
            if (str.length <= 3) {
                formatted = str;
            } else {
                let last3 = str.slice(-3);
                let rest = str.slice(0, -3);
                let parts = [];
                while (rest.length > 0) {
                    parts.unshift(rest.slice(Math.max(0, rest.length - 2)));
                    rest = rest.slice(0, Math.max(0, rest.length - 2));
                }
                formatted = parts.join(',') + ',' + last3;
            }
        } else {
            formatted = str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

        if (decPart) {
            formatted += '.' + decPart;
        }

        return isNegative ? '-' + formatted : formatted;
    }

    return {
        numberToWords: numberToWords
    };
}));