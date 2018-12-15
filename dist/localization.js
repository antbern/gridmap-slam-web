define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LocalizationAlgoritm {
        constructor(map, robot) {
            this.map = map;
            this.robot = robot;
            this.map = map;
            this.robot = robot;
            // initialize probabilities
            this.mapProbabilities = [];
            for (var i = 0; i < map.getMapRaw().length; i++) {
                this.mapProbabilities[i] = map.isOccupiedIdx(i) ? 0 : 1;
            }
            // then normalize
            this.mapProbabilities = normalize(this.mapProbabilities);
        }
        // taken from https://www.cs.cmu.edu/~motionplanning/lecture/Chap9-Bayesian-Mapping_howie.pdf
        // page 23 has the algorithm
        update(u, m) {
            // does a robot move, updating the probabilites using bayesian inference
            // dX,dY is the control input Y
            // first, take measurement straight ahead
            //y = measure(robot.x + robot.dirX, robot.y + robot.dirY);
            // new probabilities
            var newProb = [];
            // create P' = Pp
            var Pp = [];
            // iterate over all possible states x
            for (var i = 0; i < this.mapProbabilities.length; i++) {
                var sum = 0;
                // iterate over all possible states x' in X AGAIN
                for (var j = 0; j < this.mapProbabilities.length; j++) {
                    // calculate P(x | u, x') * P(x')
                    sum += this.pMotion(i, j, u) * this.mapProbabilities[j];
                }
                Pp[i] = sum;
                // calculate P(x) = P(y| x) * P'(x)
                newProb[i] = this.pMeasurement(i, m) * Pp[i];
            }
            // normalize calculated probabilities
            newProb = normalize(newProb);
            this.mapProbabilities = newProb;
        }
        // calculates the probability P(x | u, x'), where x' = start, x = end
        pMotion(endIdx, startIdx, u) {
            const startX = this.map.getX(startIdx);
            const startY = this.map.getY(startIdx);
            const endX = this.map.getX(endIdx);
            const endY = this.map.getY(endIdx);
            // if we ended up in an occupied place, return 0
            if (this.map.isOccupiedIdx(endIdx))
                return 0;
            // only return 1 if the move was exact
            if (startX + u.dX == endX && startY + u.dY == endY)
                return 0.999;
            return 0.001;
        }
        // calculates P(y|x)
        // y whether or not the robot measured an occupied (=1) or free (=0) 
        // cell in front 
        pMeasurement(idx, m) {
            const x = this.map.getX(idx);
            const y = this.map.getY(idx);
            // probability is related to if this is correct given the map (that we know)
            // traverse the map we know to see if this is a correct measurement given the map that we know
            // it should be free for (m.dist - 1) tiles and then occupied
            /*
            // make sure the map is not occupied for the measured distance
            for (var d = 0; d < m.dist; d++) {
                if (this.map.isOccupied(x + m.dX * d, y + m.dY * d))
                    return 0.1;
            }
    
            const mapOccupied = this.map.isOccupied(x + m.dX * m.dist, y + m.dY * m.dist);
    
            if (mapOccupied == m.occupied)
                return 0.9;
    
            return 0.1;
            */
            let prob = 1;
            for (let d = 0; d <= m.dist; d++) {
                // is this an empty cell? (as stated by the measurement)
                // the probability that this cell is occupied as we think in the map
                const pOcc = this.map.isOccupied(x + m.dX * d, y + m.dY * d) ? 0.9 : 0.1;
                // if this cell should be occupied, multiply by the pOcc, otherwise by (1-pOcc)
                prob *= (d == m.dist && m.occupied ? pOcc : 1 - pOcc);
            }
            // take the left and right readings into account too
            const probLeft = this.map.isOccupied(x + m.dY, y - m.dX) ? 0.9 : 0.1;
            const probRight = this.map.isOccupied(x - m.dY, y + m.dX) ? 0.9 : 0.1;
            prob *= (m.occupiedLeft ? probLeft : (1 - probLeft));
            prob *= (m.occupiedRight ? probRight : (1 - probRight));
            return prob;
        }
        draw(ctx, cellSize) {
            // draw the map first (again)
            this.map.draw(ctx);
            // draw all probailities
            for (let i = 0; i < this.mapProbabilities.length; i++) {
                // only draw on the non-occupied squares
                //if (this.map.isOccupiedIdx(i))
                //    continue;
                const x = this.map.getX(i);
                const y = this.map.getY(i);
                ctx.fillStyle = this.probToColor(this.mapProbabilities[i]);
                ctx.fillRect(cellSize * x, cellSize * y, cellSize, cellSize);
            }
            // draw probability bar
            /*
            ctx.translate(100, this.map.gridHeight * cellSize);
            // draw color bar
            const colorBarWidth = 200;
            const colorBarSteps = 20;
            for (var i = 0; i < colorBarSteps; i++) {
                ctx.fillStyle = this.probToColor(i / colorBarSteps);
                ctx.fillRect(i * colorBarWidth / colorBarSteps, 0 , colorBarWidth / colorBarSteps, 10);
            }
            
            ctx.fillStyle = "#000000";
            ctx.strokeRect(0, 0, colorBarWidth, 10)
    
            // text
            const labels = [0, 0.5, 1];
            ctx.font = "15px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "#000000";
            for (var i = 0; i < labels.length; i++) {
                ctx.fillText(labels[i].toString(), labels[i] * colorBarWidth, 25);
            }
    
            ctx.translate(-100, -this.map.gridHeight * cellSize);
            */
            ctx.translate(this.map.gridWidth * cellSize + 5, 100);
            // draw color bar
            const colorBarWidth = 200;
            const colorBarSteps = 20;
            for (let i = colorBarSteps - 1; i >= 0; i--) {
                ctx.fillStyle = this.probToColor(i / (colorBarSteps - 1));
                ctx.fillRect(0, i * colorBarWidth / colorBarSteps, 10, colorBarWidth / colorBarSteps);
            }
            ctx.fillStyle = "#000000";
            ctx.strokeRect(0, 0, 10, colorBarWidth);
            // text
            const labels = [0, 0.5, 1];
            ctx.font = "15px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "#000000";
            for (var i = 0; i < labels.length; i++) {
                ctx.fillText(labels[i].toString(), 25, labels[i] * colorBarWidth);
            }
            ctx.translate(-this.map.gridWidth * cellSize - 5, -100);
        }
        probToColor(p) {
            //p = p * p * (3 - 2 * p); // smoothstep
            p = Math.pow(p, 1 / 1.3); // "gamma correction"
            let col = d3.color("#ff5000"); //d3.color(d3.interpolateWarm(this.mapProbabilities[i]));
            col.opacity = p; //0.99;
            return col.toString();
        }
    }
    exports.LocalizationAlgoritm = LocalizationAlgoritm;
    function normalize(data) {
        const dataSum = data.reduce((prev, curr) => (prev + curr), 0);
        return data.map((val) => val / dataSum);
    }
    exports.normalize = normalize;
});
//# sourceMappingURL=localization.js.map