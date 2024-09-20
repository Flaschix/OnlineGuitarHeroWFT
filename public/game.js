/** @type {import("../typings/phaser")} */

import { LoadingScene } from "./scenes/LoadingScene.mjs"
import { LobbyScene } from "./scenes/LobbyScene.mjs";
import { GameScene } from "./scenes/GameScene.mjs";

let game;

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720,
        parent: 'gameContainer'
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    },
    scene: [LoadingScene, LobbyScene, GameScene],
    dom: {
        createContainer: true
    }
};

game = new Phaser.Game(config);
