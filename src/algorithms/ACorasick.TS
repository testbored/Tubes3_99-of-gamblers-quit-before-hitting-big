class ACNode {
    children: Map<string, ACNode> = new Map();
    fail: ACNode | null = null;
    dictlink : ACNode | null = null;
    word: string | null = null;
}

export class AhoCorasick {
    root: ACNode = new ACNode();

    insert(word: string) {
        let node = this.root;
        for (const char of word) {
            if (!node.children.has(char)) {
                node.children.set(char, new ACNode());
            }
            node = node.children.get(char)!;
        }
        node.word = word;
    }

    buildlinks(){
        const queue: ACNode[] = [];

        for(const child of this.root.children.values()){
            child.fail = this.root;
            queue.push(child);
        }

        while(queue.length > 0){
            const curr = queue.shift()!;
            for(const [char, child] of curr.children){
                let fails = curr.fail

                while(fails && !fails.children.has(char)){
                    fails = fails.fail
                }

                child.fail = fails ? fails.children.get(char)! : this.root;
                
                if(child.fail.word != null){
                    child.dictlink = child.fail;
                } else{
                    child.dictlink = child.fail.dictlink;
                }

                queue.push(child);
            }

        }
    }

    search(text : string){
        let curr = this.root;
        const results: { word: string; index: number }[] = [];

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            while (curr !== this.root && !curr.children.has(char)) {
                curr = curr.fail!;
            }

            curr = curr.children.get(char) || this.root;
            let temp: ACNode | null = curr;
            while (temp !== null) {
                if (temp.word) {
                    const idx = i - temp.word.length + 1;
                    console.log(`Found "${temp.word}" at index ${idx}`);
                    results.push({ word: temp.word, index: idx });
                }
                temp = temp.dictlink;
            }
        }

        return results;
    }
}
