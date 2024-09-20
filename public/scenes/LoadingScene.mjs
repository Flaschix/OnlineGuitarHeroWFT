import { CST } from "../CST.mjs";
import { AnimationControl } from "../share/AnimationControl.mjs";

export class LoadingScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENE.LOADINGSCENE });
    }

    preload() {
        this.loading = new AnimationControl(AnimationControl.LOADING)
        this.loading.create(this, './assets/loading.png', 800, 800);

        // this.load.spritesheet('loading', './assets/loading.png', {
        //     frameWidth: 800,
        //     frameHeight: 800
        // });
    }

    create() {
        this.loading.createAnimation(this, 0, 11);

        // this.anims.create({
        //     key: 'loadingAnimation',
        //     frames: this.anims.generateFrameNumbers('loading', { start: 0, end: 11 }), // Предполагаем, что у вас 60 кадров
        //     frameRate: 24, // Скорость анимации (кадров в секунду)
        //     repeat: -1 // Бесконечный повтор
        // });
        this.scene.start(CST.SCENE.LOBBYSCENE);
    }
}
