const REGEX = /\b[a-z]+\d{2,}\b/i;

export const RegEx = (text: string): number => {
    return text.search(REGEX);
};

export const isValidCode = (text: string): boolean => {
    return REGEX.test(text);
};

export const getCodeMatch = (text: string): string | null => {
    const match = text.match(REGEX);
    return match ? match[0] : null;
};
