
import { LocalizationAlgoritm } from './localization';
import { SLAMAlgoritm } from './slam';

export { Map, Robot, Direction, IAlgoritm, Control, Measurement };

// some constant variables
const cellSize = 28;

interface IAlgoritm {
    update(u: Control, m: Measurement): any;
    draw(ctx: CanvasRenderingContext2D, cellSize: number): any;
}

// holds a control input, basically a movement på (dX, dY)
class Control {
    constructor(public dX: number, public dY: number) {
    }
}

// holds a measurement taken relative to the robot position (dX, dY)
class Measurement {
    constructor(public dX: number, public dY: number, public occupied: boolean, public dist: number, public occupiedLeft: boolean, public occupiedRight: boolean) {
    }
}


class App {
    // for drawing 
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private robot: Robot;
    private map: Map;

    private algoLocalization: IAlgoritm;
    private algoSLAM: IAlgoritm;

    private lastMeasurement: Measurement;

    private autoAI = false;
    private timerId: number;

    private mouseX: number = -1;
    private mouseY: number = -1;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");


        // set up some event listeners
        window.addEventListener("keypress", (e: KeyboardEvent) => this.keypress(e), false);
        this.canvas.addEventListener("mousedown", (e: MouseEvent) => this.mousedown(e), false);
        this.canvas.addEventListener("mousemove", (e: MouseEvent) => this.mousemove(e), false);
        this.canvas.addEventListener("mouseout", (e: MouseEvent) => this.mouseout(e), false);
        // create robot
        this.robot = new Robot(1, 1);

        // create map
        this.map = new Map();


        // set attributes
        this.canvas.setAttribute("width", (cellSize * this.map.gridWidth * 3 + 10).toString());
        this.canvas.setAttribute("height", (cellSize * this.map.gridHeight * 2 + 10).toString());

        // create algoritm instance
        this.algoLocalization = new LocalizationAlgoritm(this.map, this.robot);
        this.algoSLAM = new SLAMAlgoritm();

        // start draw chain
        this.draw();

    }

    public draw() {

        // clear the background
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // draw the maze!
        this.map.draw(this.ctx);



        // let the algoritm do its drawing
        this.ctx.translate(0, this.map.gridHeight * cellSize + cellSize / 4);
        this.algoLocalization.draw(this.ctx, cellSize);
        this.ctx.translate(0, -this.map.gridHeight * cellSize - cellSize / 4);

        this.ctx.translate(this.map.gridWidth * cellSize + cellSize / 4, 0);
        this.algoSLAM.draw(this.ctx, cellSize);

        // call mouse overlay thing
        if (this.mouseY >= 0 && this.mouseX >= this.map.gridWidth * cellSize + cellSize / 4)
            (<SLAMAlgoritm>this.algoSLAM).drawMouseHover(this.mouseX - (this.map.gridWidth * cellSize + cellSize / 4), this.mouseY, this.ctx, cellSize);

        this.ctx.translate(-this.map.gridWidth * cellSize - cellSize / 4, 0);

        // draw the robot!
        this.robot.draw(this.ctx);

        // draw the last measurement
        if (this.lastMeasurement) {
            this.ctx.strokeStyle = this.lastMeasurement.occupied ? "red" : "yellow";
            this.ctx.beginPath();
            this.ctx.moveTo((this.robot.x + 0.5) * cellSize, (this.robot.y + 0.5) * cellSize);
            this.ctx.lineTo((this.robot.x + this.lastMeasurement.dX * this.lastMeasurement.dist + 0.5) * cellSize, (this.robot.y + this.lastMeasurement.dY * this.lastMeasurement.dist + 0.5) * cellSize);
            this.ctx.stroke();
        }

        // request to be drawn again!
        window.requestAnimationFrame(() => this.draw());

    }

    // called whenever the robot has moved and/or rotated
    public update(dX: number, dY: number) {
        // construct control and measurement information
        const mX = this.robot.heading.dirX;
        const mY = this.robot.heading.dirY;
        //const m = new Measurement(mX, mY, this.map.isOccupied(this.robot.x + mX, this.robot.y + mY), this.measureDistanceFront());
        const m = this.measureDistance(this.robot.x, this.robot.y, mX, mY);
        //console.log(m);
        this.lastMeasurement = m;

        const u = new Control(dX, dY);

        // and let algorithm do its thing
        this.algoLocalization.update(u, m);
        this.algoSLAM.update(u, m);

    }

    public measureDistance(x: number, y: number, dX: number, dY: number): Measurement {

        // var x = this.robot.x;
        // var y = this.robot.y;

        var dist = 0;
        var occupied = false;
        /*
        while (true) {
            // have we reached the "max sensor range" ?
            if (dist > 5) {
                occupied = false;
                break;
            }

            x += dX;
            y += dY;
            if (this.map.inBounds(x, y) && !this.map.isOccupied(x, y))
                dist++;
            else
                break;
        }
        */
        //this.map.isOccupied(x, y)
        const occupiedLeft = this.map.isOccupied(x + dY, y - dX);
        const occupiedRight = this.map.isOccupied(x - dY, y + dX);


        while (this.map.inBounds(x, y) && !occupied) {
            x += dX;
            y += dY;
            occupied = this.map.isOccupied(x, y);

            // increase measurement range
            dist++;

            // check for max range
            if (dist >= 5)
                break;
        }


        // add some random distortion to the measurement
        dist += Math.round(randn_bm() * 0.5 * 0.5);
        occupied = Math.random() > 0.94 ? !occupied : occupied;

        return new Measurement(dX, dY, occupied, dist, occupiedLeft, occupiedRight);

    }

    public keypress(e: KeyboardEvent) {

        switch (e.key) {
            case "w":
                if (this.robot.tryMove(this.map))
                    this.update(this.robot.heading.dirX, this.robot.heading.dirY);
                break;
            case "a":
                this.robot.heading.rotateLeft();
                this.update(0, 0);
                break;
            case "d":
                this.robot.heading.rotateRight();
                this.update(0, 0);
                break;
            case "q":
                this.doAI();
                break;
            case "t":
                this.autoAI = !this.autoAI;

                if (this.autoAI) {
                    this.timerId = setInterval(() => this.doAI(), 300);
                } else
                    clearInterval(this.timerId);
                break;
            case "e":

                console.log((<SLAMAlgoritm>this.algoSLAM).logMap.getEntropy());
                break;

        }
    };

    private doAI() {
        let u = (<SLAMAlgoritm>this.algoSLAM).doAICalculation();

        if (u != null) {
            console.log("AI");
            // rotate to face control first (TODO: Remove this as it is cheating!! :P)
            this.robot.heading.dirX = u.dX;
            this.robot.heading.dirY = u.dY;
            if (this.robot.tryMove(this.map))
                this.update(u.dX, u.dY);
            else // if we could not move, just send new measurements
                this.update(0, 0);
        }

        // if (this.autoAI)
        //     setTimeout(() => this.doAI(), 500);
    }

    public mousedown(e: MouseEvent) {
        const bb = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - bb.left;
        const mouseY = e.clientY - bb.top;

        const mapX = Math.floor(mouseX / cellSize);
        const mapY = Math.floor(mouseY / cellSize);

        if (this.map.inBounds(mapX, mapY) && !this.map.isOccupied(mapX, mapY)) {
            this.robot.x = mapX;
            this.robot.y = mapY;
        }
    };

    public mousemove(e: MouseEvent) {
        const bb = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - bb.left;
        this.mouseY = e.clientY - bb.top;

    }
    public mouseout(e: MouseEvent) {
        this.mouseX = -1;
        this.mouseX = -1;
    }
}

// taken from: https://stackoverflow.com/a/36481059
// Standard Normal variate using Box-Muller transform with mean 0, variance 1.
function randn_bm() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

class Map {
    // the map
    private map: Array<number> = [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1,
        1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1,
        1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1,
        1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1,
        1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1,
        1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1,
        1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1,
        1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ];

    // size of world
    public gridWidth = 15
    public gridHeight = 15;



    inBounds(x: number, y: number): boolean {
        return !(x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight);
    }

    index(x: number, y: number): number {
        return x + y * this.gridWidth;
    }

    getX(idx: number): number {
        return idx % this.gridWidth
    }
    getY(idx: number): number {
        return Math.floor(idx / this.gridWidth);
    }

    isOccupied(x: number, y: number): boolean {
        if (!this.inBounds(x, y))
            return true;
        return this.isOccupiedIdx(this.index(x, y));
    }
    isOccupiedIdx(idx: number): boolean {
        return this.map[idx] != 0;
    }

    getMapRaw(): Array<number> {
        return this.map;
    }

    // draw this map, based on position (0,0)
    draw(ctx: CanvasRenderingContext2D) {
        for (var i = 0; i < this.map.length; i++) {
            const x = this.getX(i);
            const y = this.getY(i);
            ctx.fillStyle = (this.isOccupiedIdx(i) ? "#1f5fc4" : "#0f0f0f");

            // draw a rectangle
            ctx.fillRect(cellSize * x, cellSize * y, cellSize, cellSize);

            // only draw walls to the side
            //if(map[i] != 0)
            //    ctx.fillRect(cellSize * x + cellSize * this.gridWidth, cellSize * y, cellSize, cellSize);
        }

    }
}



class Direction {

    constructor(public dirX: number, public dirY: number) {
        this.dirY = dirY;
        this.dirX = dirX;
    }

    rotateLeft() {
        const tmp = this.dirX;
        this.dirX = this.dirY;
        this.dirY = -tmp;
    }
    rotateRight() {
        const tmp = this.dirX;
        this.dirX = -this.dirY;
        this.dirY = tmp;
    }

    copy() {
        return new Direction(this.dirX, this.dirY);
    }
}

class Robot {
    heading: Direction;

    constructor(public x: number, public y: number) {
        this.x = x;
        this.y = y;
        this.heading = new Direction(0, 1);
    }

    tryMove(map: Map): boolean {
        const newX = this.x + this.heading.dirX;
        const newY = this.y + this.heading.dirY;

        if (!map.isOccupied(newX, newY)) {
            this.x = newX;
            this.y = newY;
            return true;
        }

        return false;
    }

    draw(ctx: CanvasRenderingContext2D) {
        // draw robot
        const robotFraction = 1 / 6; // the size of the robot

        ctx.fillStyle = "#00ffff";
        ctx.fillRect((this.x + robotFraction) * cellSize, (this.y + robotFraction) * cellSize, (1 - 2 * robotFraction) * cellSize, (1 - 2 * robotFraction) * cellSize);

        // "head"
        const headSize = (1 - 2 * robotFraction) * cellSize / 3;
        const headOffset = (1 - 2 * robotFraction) / 2 * cellSize;
        const headCenterX = (this.x + 0.5) * cellSize + this.heading.dirX * headOffset;
        const headCenterY = (this.y + 0.5) * cellSize + this.heading.dirY * headOffset;

        ctx.fillStyle = "#ffff00"
        ctx.fillRect(headCenterX - headSize / 2, headCenterY - headSize / 2, headSize, headSize);

    }
}

// get the chanvas object
const canvas = <HTMLCanvasElement>document.getElementById("cnvs");
new App(canvas);

