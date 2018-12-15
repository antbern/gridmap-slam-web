define(["require", "exports", "./app", "./localization", "./Util"], function (require, exports, app_1, localization_1, Util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class BFSNode {
        constructor(me, path) {
            this.me = me;
            this.path = path;
        }
    }
    class SLAMAlgoritm {
        constructor() {
            this.map = new LogOddsMap(30, 30);
            this.mapProbabilities = new Array();
            for (let i = 0; i < this.map.length(); i++) {
                this.mapProbabilities[i] = 0;
            }
            // need somewhere to start!
            this.lastPosition = this.map.getIdx(10, 10);
            this.mapProbabilities[this.lastPosition] = 1;
            //this.lastFill = new Array<number>();
        }
        get logMap() {
            return this.map;
        }
        doAICalculation() {
            return this.doAICalculationBFS();
            const cx = this.map.getX(this.lastPosition);
            const cy = this.map.getY(this.lastPosition);
            let paths = new Array();
            this.findPaths(cx, cy, paths);
            // select the shortest path that has more than 1 coordinate (since the first one is always this position)
            paths = paths.sort((a, b) => a.size() - b.size()).filter((value) => value.size() > 1);
            // iterate until we find a path that makes us move (otherwise we could get stuck!)
            for (const p of paths) {
                p.pop(); // pop the first one
                const goTo = p.pop(); // select the second one
                if ((goTo.x - cx) != 0 || (goTo.y - cy) != 0) {
                    // store the last one, the "goal"
                    this.currentTarget = p.last();
                    return new app_1.Control(goTo.x - cx, goTo.y - cy);
                }
            }
            // no nice move found, do a random move!
            const dX = Math.random() > 0.5 ? (Math.random() > 0.5 ? 1 : -1) : 0;
            const dY = dX == 0 ? (Math.random() > 0.5 ? 1 : -1) : 0;
            return new app_1.Control(dX, dY);
        }
        // finds all paths that lead to an opening
        findPaths(x, y, paths = [], path = new Util_1.Path()) {
            //console.log("Entering: " + x + ", " + y);
            // limit depth
            if (path.size() > 50)
                return;
            // check if we have been here before (in this specific path)
            if (path.has(x, y))
                return;
            // is this an opening?
            if (this.isInteresting(x, y)) {
                // yes, do not go further, but add this path to the list of paths
                paths.push(path);
                return;
            }
            //if (this.isOccupied(x, y))
            //    return;
            // let any neighbour check too, if they are not occupied
            if (!this.isOccupied(x + 1, y))
                this.findPaths(x + 1, y, paths, new Util_1.Path(path, new Util_1.Coord(x, y)));
            if (!this.isOccupied(x - 1, y))
                this.findPaths(x - 1, y, paths, new Util_1.Path(path, new Util_1.Coord(x, y)));
            if (!this.isOccupied(x, y + 1))
                this.findPaths(x, y + 1, paths, new Util_1.Path(path, new Util_1.Coord(x, y)));
            if (!this.isOccupied(x, y - 1))
                this.findPaths(x, y - 1, paths, new Util_1.Path(path, new Util_1.Coord(x, y)));
        }
        isInteresting(x, y, p = 0.25) {
            return Math.abs(this.map.probOccupied(x, y) - 0.5) < p;
        }
        isOccupied(x, y) {
            return this.map.probOccupied(x, y) >= 0.5 + 0.15;
        }
        isFree(x, y) {
            return this.map.probOccupied(x, y) < 0.5 - 0.15;
        }
        doAICalculationBFS() {
            const cx = this.map.getX(this.lastPosition);
            const cy = this.map.getY(this.lastPosition);
            console.log("@[%d,%d]", cx, cy);
            let n = null;
            // iterate with increasing "interesting rate" until we find something to look for
            for (let p = 0.25; p < 0.5 && n == null; p += 0.1) {
                n = this.findNextTargetBFS(cx, cy, (to, from, depth) => {
                    // only visit a free cell (a path) or a wall next to one
                    return this.isFree(to.x, to.y) || (this.isFree(from.x, from.y) && this.isInteresting(to.x, to.y, p));
                }, (cell, depth) => {
                    return this.isInteresting(cell.x, cell.y, p); // && !this.isFree(cell.x, cell.y);
                });
            }
            // if there was nothing to be found AT ALL, just dont do anything
            if (n == null)
                return null;
            // for drawing purposes
            this.currentTarget = n.me;
            console.log(n);
            // make sure we have somewhere to go, and then go there
            if (n.path.size() >= 1) {
                const goTo = n.path.pop();
                return new app_1.Control(goTo.x - cx, goTo.y - cy);
            }
            // no nice move found, do a random move!
            const dX = Math.random() > 0.5 ? (Math.random() > 0.5 ? 1 : -1) : 0;
            const dY = dX == 0 ? (Math.random() > 0.5 ? 1 : -1) : 0;
            return new app_1.Control(dX, dY);
        }
        /**
         * Does a Breadth-First search looking for any cell that is interesting to explore and returns the first one found
         * which is the cloest one
         * @param x x-coordinate of the starting cell
         * @param y y-coordinate of the starting cell
         * @param shouldVisit a function to determine if the algorithm should visit a given cell from another cell
         * @param predicate returns whether or not we have found a goal
         */
        findNextTargetBFS(x, y, shouldVisit, predicate) {
            let queue = new Util_1.Queue();
            let visited = new Array();
            this.visited = visited;
            // add initial node
            queue.push(new BFSNode(new Util_1.Coord(x, y), new Util_1.Path()));
            // neighbours to visit
            const neighbours = [new Util_1.Coord(-1, 0), new Util_1.Coord(1, 0), new Util_1.Coord(0, 1), new Util_1.Coord(0, -1)];
            // iterate!
            while (!queue.isEmpty()) {
                // take the next element (from top)
                let node = queue.pop();
                // make sure we have not visited before
                if (visited.find((value) => value.me.x == node.me.x && value.me.y == node.me.y))
                    continue;
                // add this node to the visited list
                visited.push(node);
                const depth = node.path.size();
                // check if we are done
                if (predicate(node.me, depth)) {
                    return node;
                }
                for (let n of neighbours) {
                    const c = new Util_1.Coord(node.me.x + n.x, node.me.y + n.y);
                    if (shouldVisit(c, node.me, depth))
                        queue.push(new BFSNode(c, new Util_1.Path(node.path, c)));
                }
            }
            return null;
        }
        /*
            // calculates what move to do next to find out as much of the map as possible, and returns a corresponding Control object
            doAICalculation2(): Control | null {
                
                // do a "flood fill" on the map, considering all propabilities > 0.5 as "occupied"
        
                this.lastFill = this.flood_fill_req(this.lastPosition);
        
                // do path to closest opening
                if (this.lastFill.length < 2)
                    return null;
                let target = this.lastFill[this.lastFill.length - 1];
                const tx = this.map.getX(target);
                const ty = this.map.getY(target);
        
                const cx = this.map.getX(this.lastPosition);
                const cy = this.map.getY(this.lastPosition);
                console.log("Current: " + cx + ", " + cy);
                console.log("Target: " + tx + ", " + ty);
        
                //console.log(Math.atan2(ty - cy, tx - cx) / (Math.PI / 2));
        
                let rad = Math.round(Math.atan2(ty - cy, tx - cx) / (Math.PI / 2)) * Math.PI / 2;
                console.log(rad * 180 / Math.PI);
                //if (cx - tx < cy - ty)
                // console.log((Math.cos(rad)) + ", " + (Math.sin(rad)));
                // console.log(Math.round(Math.cos(rad)) + ", " + Math.round(Math.sin(rad)));
        
                return new Control(Math.round(Math.cos(rad)), Math.round(Math.sin(rad)));
                return null;
            }
        
            flood_fill(startIdx: number): Array<number> {
                // result queue
                let res = Array<number>();
        
                // queue for cells in action
                let q = new Queue<number>();
                q.push(startIdx);
        
                let i = null;
                // iterate while we have items left
                while (i = q.pop()) {
        
                    if (res.indexOf(i) >= 0)
                        continue;
        
                    //console.log(i);
        
                    res.push(i);
                    const x = this.map.getX(i);
                    const y = this.map.getY(i);
        
                    // now check if any of theese are not occupied and if so add them to the queue for further inspection
                    if (this.map.probOccupied(x + 1, y) < 0.5)
                        q.push(this.map.getIdx(x + 1, y));
                    if (this.map.probOccupied(x - 1, y) < 0.5)
                        q.push(this.map.getIdx(x - 1, y));
        
                    if (this.map.probOccupied(x, y + 1) < 0.5)
                        q.push(this.map.getIdx(x, y + 1));
                    if (this.map.probOccupied(x, y - 1) < 0.5)
                        q.push(this.map.getIdx(x, y - 1));
        
                }
        
        
                return res;
        
            }
        
            flood_fill_req(startIdx: number): Array<number> {
                // result queue
                let res = Array<number>();
                let visited = Array<number>();
        
                // queue for cells in action
                let q = new Queue<number>();
                q.push(startIdx);
        
                let i = null;
                // iterate while we have items left
                while (i = q.pop()) {
        
                    if (visited.indexOf(i) >= 0)
                        continue;
                    visited.push(i);
        
        
                    // is this an unexplored ending?
                    if (this.map.probOccupiedIdx(i) == 0.5) {
                        res.push(i);
                        continue;
                    }
        
                    const x = this.map.getX(i);
                    const y = this.map.getY(i);
        
                    //console.log("Visit: " + x + ", " + y);
        
        
                    // now check if any of theese are not occupied and if so add them to the queue for further inspection
                    if (this.map.probOccupied(x + 1, y) < 0.7)
                        q.push(this.map.getIdx(x + 1, y));
                    if (this.map.probOccupied(x - 1, y) < 0.7)
                        q.push(this.map.getIdx(x - 1, y));
        
                    if (this.map.probOccupied(x, y + 1) < 0.7)
                        q.push(this.map.getIdx(x, y + 1));
                    if (this.map.probOccupied(x, y - 1) < 0.7)
                        q.push(this.map.getIdx(x, y - 1));
        
                }
        
                return res;
        
            }
        
        */
        update(u, m) {
            // first, advance our states by taking the motion u and measurement m into consideration
            // new probabilities
            let newProb = [];
            // create P' = Pp
            let Pp = [];
            // iterate over all possible states x
            for (let i = 0; i < this.mapProbabilities.length; i++) {
                let sum = 0;
                // iterate over all possible states x' in X AGAIN
                for (let j = 0; j < this.mapProbabilities.length; j++) {
                    // calculate P(x | u, x') * P(x')
                    sum += this.pMotion(i, j, u) * this.mapProbabilities[j];
                }
                // the sum is basically the probability that any previous position led to this position (i)
                Pp[i] = sum;
                // calculate P(x) = P(y| x) * P'(x), which takes the measurement into account
                newProb[i] = this.pMeasurement(i, m) * Pp[i];
            }
            // normalize calculated probabilities
            newProb = localization_1.normalize(newProb);
            this.mapProbabilities = newProb;
            // next, find most probable position by finding the index with highest probability
            const indexOfMaxValue = this.mapProbabilities.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
            // lastly, integrate the measurement into the map based on the most probable position
            this.integrateMeasurement(m, indexOfMaxValue);
            // store some state
            this.lastMeasurement = m;
            this.lastPosition = indexOfMaxValue;
        }
        // calculates the probability P(x | u, x'), where x' = start, x = end
        pMotion(endIdx, startIdx, u) {
            const startX = this.map.getX(startIdx);
            const startY = this.map.getY(startIdx);
            const endX = this.map.getX(endIdx);
            const endY = this.map.getY(endIdx);
            // if we ended up in an occupied place, return 0
            //if (this.map.isOccupiedIdx(endIdx))
            //    return 0;
            // another idea
            const errX = Math.abs(startX + u.dX - endX);
            const errY = Math.abs(startY + u.dY - endY);
            return 0.999 / (Math.pow(1 + errX, 8) * Math.pow(1 + errY, 8));
            // only return 1 if the move was exact
            if (startX + u.dX == endX && startY + u.dY == endY)
                return 0.999;
            return 0.001;
        }
        // calculates P(m|x)
        // y whether or not the robot measured an occupied (=1) or free (=0) 
        // cell in front 
        pMeasurement(idx, m) {
            const x = this.map.getX(idx);
            const y = this.map.getY(idx);
            // probability is related to if this is correct given the map (that we know)
            //const mapOccupied = this.map.probOccupied(x + m.dX, y + m.dY);
            // take the product of the probability that the measurement was correct for each cell
            var prob = 1;
            for (let d = 0; d <= m.dist; d++) {
                // is this an empty cell? (as stated by the measurement)
                // the probability that this cell is occupied as we think in the map
                const pOcc = this.map.probOccupied(x + m.dX * d, y + m.dY * d);
                // if this cell should be occupied, multiply by the pOcc, otherwise by (1-pOcc)
                prob *= (d == m.dist && m.occupied ? pOcc : 1 - pOcc);
            }
            // take the left and right readings into account too
            const probLeft = this.map.probOccupied(x + m.dY, y - m.dX);
            const probRight = this.map.probOccupied(x - m.dY, y + m.dX);
            prob *= (m.occupiedLeft ? probLeft : (1 - probLeft));
            prob *= (m.occupiedRight ? probRight : (1 - probRight));
            return prob;
        }
        integrateMeasurement(m, pos) {
            const x = this.map.getX(pos);
            const y = this.map.getY(pos);
            // iterate over all visited grid cells
            for (let d = 0; d <= m.dist; d++) {
                // what is the probability that this cell is occupied, as stated by the measurement?
                const prob = (d == m.dist && m.occupied ? 0.80 : 0.2);
                // update map with this probability
                this.map.updateWithProb(this.map.getIdx(x + m.dX * d, y + m.dY * d), prob);
            }
            // integrate the left and right measurements too (very certain!)
            this.map.updateWithProb(this.map.getIdx(x + m.dY, y - m.dX), m.occupiedLeft ? 0.8 : 0.2);
            this.map.updateWithProb(this.map.getIdx(x - m.dY, y + m.dX), m.occupiedRight ? 0.8 : 0.2);
        }
        draw(ctx, cellSize) {
            // draw the map, and robot probability
            for (let i = 0; i < this.map.length(); i++) {
                const x = this.map.getX(i);
                const y = this.map.getY(i);
                // TODO: mix the probability of the robot being here as well!
                //ctx.fillStyle = d3.interpolateGreys(this.map.probOccupiedIdx(i));
                var col = d3.color(d3.interpolateGreys(this.map.probOccupiedIdx(i))); //d3.color(d3.interpolateWarm(this.mapProbabilities[i]));
                //col = d3.rgb(255*this.mapProbabilities[i], this.map.probOccupiedIdx(i) * 255, 128);
                ctx.fillStyle = col.toString();
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                ctx.fillStyle = d3.color(d3.interpolateReds(this.mapProbabilities[i])).toString();
                ctx.fillRect((x + 0.2) * cellSize, (y + 0.2) * cellSize, cellSize * 0.6, cellSize * 0.6);
            }
            if (this.visited != null) {
                for (let i = 0; i < this.visited.length; i++) {
                    const c = this.visited[i].me;
                    ctx.fillStyle = "#0000f0";
                    //if (i == 1)
                    //    ctx.fillStyle = "#FF00F0";
                    ctx.fillRect((c.x + 0.3) * cellSize, (c.y + 0.3) * cellSize, cellSize * 0.4, cellSize * 0.4);
                }
            }
            if (this.currentTarget) {
                ctx.fillStyle = "#FF00F0";
                ctx.fillRect((this.currentTarget.x + 0.3) * cellSize, (this.currentTarget.y + 0.3) * cellSize, cellSize * 0.4, cellSize * 0.4);
            }
        }
        drawMouseHover(mouseX, mouseY, ctx, cellSize) {
            // convert to cell coordinates
            const cx = Math.floor(mouseX / cellSize);
            const cy = Math.floor(mouseY / cellSize);
            if (!this.map.valid(cx, cy))
                return;
            const index = this.map.getIdx(cx, cy);
            const str1 = "P(O)=" + this.map.probOccupiedIdx(index).toPrecision(3);
            const str2 = "P(X)=" + this.mapProbabilities[index].toPrecision(3);
            ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
            ctx.fillRect(cx * cellSize, cy * cellSize, cellSize, cellSize);
            ctx.font = "20px Arial";
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(64, 46, 64, 0.8)";
            ctx.fillRect(mouseX, mouseY - 50, 20 + Math.max(ctx.measureText(str1).width, ctx.measureText(str2).width), 60);
            ctx.fillStyle = "white";
            ctx.fillText(str1, mouseX + 10, mouseY - 25);
            ctx.fillText(str2, mouseX + 10, mouseY - 5);
        }
    }
    exports.SLAMAlgoritm = SLAMAlgoritm;
    class LogOddsMap {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.logMap = new Array(width * height);
            // initialize grid with 0.5 probability of being occupied
            for (var i = 0; i < width * height; i++) {
                this.logMap[i] = logOdds(0.5);
            }
        }
        getIdx(x, y) {
            return x + y * this.width;
        }
        getX(idx) {
            return idx % this.width;
        }
        getY(idx) {
            return Math.floor(idx / this.width);
        }
        validIdx(idx) {
            return !(idx < 0 || idx >= this.logMap.length);
        }
        valid(x, y) {
            return !(x < 0 || x >= this.width || y < 0 || y >= this.height);
        }
        length() {
            return this.width * this.height;
        }
        probOccupied(x, y) {
            if (this.valid(x, y))
                return this.probOccupiedIdx(this.getIdx(x, y));
            return invLogOdds(0.9);
        }
        probOccupiedIdx(idx) {
            return invLogOdds(this.logMap[idx]);
        }
        updateWithProb(idx, p) {
            this.logMap[idx] += logOdds(p);
        }
        getEntropy() {
            let sum = 0;
            this.logMap.forEach(c => {
                const p = invLogOdds(c);
                // sum if p != 0 and p != 1. Theese values cause NaN being added to the sum, but the limit is 0 
                if (p != 0 && p != 1)
                    sum += p * Math.log(p) + (1 - p) * Math.log(1 - p);
            });
            return -sum;
        }
    }
    function logOdds(p) {
        return Math.log(p / (1.0 - p));
    }
    function invLogOdds(l) {
        return 1.0 - 1.0 / (1 + Math.exp(l));
    }
});
//# sourceMappingURL=slam.js.map