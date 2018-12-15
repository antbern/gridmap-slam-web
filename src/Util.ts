export class Queue<T> {
    _store: T[] = [];
    push(val: T) {
        this._store.push(val);
    }
    pop(): T | undefined {
        return this._store.shift();
    }

    isEmpty(): boolean {
        return this._store.length == 0;
    }


}

export class Coord {
    constructor(public x: number = 0, public y: number = 0) {
    }
}

export class Path {
    private _store: Coord[] = [];

    constructor(other: Path = null, add: Coord = null) {
        if (other)
            this._store = Object.assign([], other._store);

        if (add)
            this.push(add);
    }

    has(x: number, y: number): boolean {
        return this._store.find((value) => value.x == x && value.y == y) != undefined;
    }

    push(val: Coord) {
        this._store.push(val);
    }
    pop(): Coord | undefined {
        return this._store.shift();
    }

    size(): number {
        return this._store.length;
    }

    last(): Coord | undefined {
        if (this._store.length > 0)
            return this._store[this._store.length - 1];
        return undefined;
    }
}