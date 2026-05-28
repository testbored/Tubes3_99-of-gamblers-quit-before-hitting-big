function getbadCharacter(pattern : string) : Map<string, number> {
    const lastOccurence = new Map<string, number>();
    const n = pattern.length;
    for(let i = 0; i < n; i++){
        lastOccurence.set(pattern[i], i);
    }

    return lastOccurence
}

function computeSuffix(pattern : string) : number[] {
    const m = pattern.length
    const suff = new Array(m)

    suff[m - 1] = m

    let g = m - 1
    let f = 0

    for (let i = m - 2; i >= 0; --i) {
        if (i > g && suff[i + m - 1 - f] < i - g) {
            suff[i] = suff[i + m - 1 - f];
        } else {
            if (i < g) g = i;
            f = i;
            while (g >= 0 && pattern[g] === pattern[g + m - 1 - f]) {
                --g;
            }
            suff[i] = f - g;
        }
    }
    return suff;
}

function getGoodSuffixTable(pattern: string): number[] {
    const m = pattern.length;
    const shiftTable = new Array(m).fill(m); 
    const suffixes = computeSuffix(pattern);

    let j = 0;
    for (let i = m - 1; i >= 0; i--) {
        if (suffixes[i] === i + 1) {
            for (; j < m - 1 - i; j++) {
                if (shiftTable[j] === m) {
                    shiftTable[j] = m - 1 - i;
                }
            }
        }
    }

    for (let i = 0; i <= m - 2; i++) {
        shiftTable[m - 1 - suffixes[i]] = m - 1 - i;
    }

    return shiftTable;
}

function BM(pattern : string, text : string) : number {
    const badMap = getbadCharacter(pattern);
    const suffArr = getGoodSuffixTable(pattern);

    const n = text.length;
    const m = pattern.length

    let t = 0;

    while(t <= n - m){
        let j = m - 1
        while(j >= 0 && pattern[j] === text[t+j]){
            j--;
        }
        if(j == -1){
            return t;
        }
        else{
            const char = text[t + j];
            const lastOcc = badMap.has(char) ? (badMap.get(char) as number) : -1;
            const shift = Math.max(1, Math.max(j - lastOcc, suffArr[j]));
            t += shift;
        }
    }
    return -1
}