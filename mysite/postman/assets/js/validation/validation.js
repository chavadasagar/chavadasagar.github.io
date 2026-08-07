export function isUrlValid(userInput) {
    if (!userInput || typeof userInput !== 'string') return false;
    let urlString = userInput.trim();
    
    // Auto prefix http if protocol omitted
    if (!/^https?:\/\//i.test(urlString)) {
        urlString = 'http://' + urlString;
    }

    try {
        const url = new URL(urlString);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}

export function formatUrl(userInput) {
    if (!userInput) return '';
    let urlString = userInput.trim();
    if (!/^https?:\/\//i.test(urlString)) {
        urlString = 'https://' + urlString;
    }
    return urlString;
}