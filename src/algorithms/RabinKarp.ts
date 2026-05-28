export function search(pattern: string, text: string): number[] {

    const d: number = 256;
    const q: number = 101;

    const m: number = pattern.length;
    const n: number = text.length;

    let p: number = 0;
    let t: number = 0;
    let h: number = 1;

    const ans: number[] = [];

    if (m > n) {
        return ans;
    }

    for (let i = 0; i < m - 1; i++) {
        h = (h * d) % q;
    }

    for (let i = 0; i < m; i++) {
        p = (d * p + pattern.charCodeAt(i)) % q;
        t = (d * t + text.charCodeAt(i)) % q;
    }

    for (let i = 0; i <= n - m; i++) {

        if (p === t) {
            let match = true;

            for (let j = 0; j < m; j++) {
                if (text[i + j] !== pattern[j]) {
                    match = false;
                    break;
                }
            }

            if (match) {
                ans.push(i);
            }
        }

        if (i < n - m) {
            t = (d * (t - text.charCodeAt(i) * h) + text.charCodeAt(i + m)) % q;
            if (t < 0) { t += q; }
        }
    }

    return ans;
}