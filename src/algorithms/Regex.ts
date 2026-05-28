const REGEX = /\b[a-z]+\d{2,3}\b/i;

export const RegEx = (text: string): number => {
    const match = REGEX.exec(text);
    return match ? match.index : -1;
};

export const isValidCode = (text: string): boolean => {
    return REGEX.exec(text) !== null;
};

export const getCodeMatch = (text: string): string | null => {
    const match = REGEX.exec(text);
    return match ? match[0] : null;
};
