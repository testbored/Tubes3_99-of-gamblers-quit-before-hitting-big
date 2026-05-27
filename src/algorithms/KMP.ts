const getLPS = (pattern: string): number[] => {
    const lps = new Array(pattern.length).fill(0);
    lps[0] = 0;
    let len = 0;
    let i = 1;
    while (i < pattern.length) {
        if (pattern[i] === pattern[len]) {
            len++;
            lps[i] = len;
            i++;
        } else {
            if (len == 0) {
                lps[i] = 0;
                i++;
            }
            else {
                len = lps[len - 1];
                lps[i] = len;
            }
        }
    }
    return lps;
};

export const KMP = (text: string, pattern: string): number => {
    const lps = getLPS(pattern);
    let i = 0;
    let j = 0;
    while (i < text.length) {
        if (text[i] === pattern[j]) {
            i++;
            j++;
        }
        else {
            if (j == 0) {
                i++;
            }
            else {
                j = lps[j - 1];
            }
        }
        if (j === pattern.length) {
            return i - j;
        }
    }
    return -1;
}