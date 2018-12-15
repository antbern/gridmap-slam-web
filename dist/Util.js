define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Queue {
        constructor() {
            this._store = [];
        }
        push(val) {
            this._store.push(val);
        }
        pop() {
            return this._store.shift();
        }
        isEmpty() {
            return this._store.length == 0;
        }
    }
    exports.Queue = Queue;
    class Coord {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }
    }
    exports.Coord = Coord;
    class Path {
        constructor(other = null, add = null) {
            this._store = [];
            if (other)
                this._store = Object.assign([], other._store);
            if (add)
                this.push(add);
        }
        has(x, y) {
            return this._store.find((value) => value.x == x && value.y == y) != undefined;
        }
        push(val) {
            this._store.push(val);
        }
        pop() {
            return this._store.shift();
        }
        size() {
            return this._store.length;
        }
        last() {
            if (this._store.length > 0)
                return this._store[this._store.length - 1];
            return undefined;
        }
    }
    exports.Path = Path;
});
//# sourceMappingURL=Util.js.map