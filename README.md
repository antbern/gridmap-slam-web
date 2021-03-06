# Grid SLAM

This is my implementation of both a full SLAM algorithm as well as a simple localization algorithm. It's written in TypeScript and compiles to pure ES6 JavaScript that can run in supported browsers.

The world of the robot is represented by a two-dimensional grid of discrete positions, as well as walls that are occupied or paths that are not.

The robot is equipped with three "sensors" that artificially measure the robot's surroundings. It has a front facing distance sensor that measure the distance to the wall with configurable max-range and disturbance (distance variance and erroneous readings). To complement this sensor, the robot is also equipped with two side-facing "on-off" sensors that tell whether or not the cell next to it is occupied.

In the localization problem the world is already known to the robot and it only tries to find its position within the world based on the observations it make. 

In the more interresting full SLAM problem, the map is unknown and has to be estimated together with the position within it.

I have also tried to add some "inteligence" to the algorithm and make it choose how the robot should move to explore the whole map.

The project is available [online](https://antbern.github.io/gridmap-slam-web/) if you want to play around. It doesn't have any fancy ui or anything but you can use WASD to move around and Q to let the AI decide the next action. Pressing T starts a timer that calls the AI repeatedly so that you don't have to press Q all the time. The live demo is simply distributed using the [gh-pages](https://www.npmjs.com/package/gh-pages) npm package and the command

```bash
gh-pages -d .
```