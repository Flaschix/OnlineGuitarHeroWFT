export class AnimationControl {

    constructor(name) {
        this.name = name;
        this.keyAnimation = `${this.name}Animation`
    }

    create(self, path, width, height) {
        self.load.spritesheet(`${this.name}`, `${path}`, {
            frameWidth: width,
            frameHeight: height
        });
    }

    createAnimation(self, startFrame, endFrame) {
        self.anims.create({
            key: this.keyAnimation,
            frames: self.anims.generateFrameNumbers(this.name, { start: startFrame, end: endFrame }),
            frameRate: 24, // Скорость анимации (кадров в секунду)
            repeat: -1 // Бесконечный повтор
        });
    }

    addLoadOnScreen(self, x, y, scaleX, scaleY) {
        self.loadingSprite = self.add.sprite(x, y, this.name); // Центрирование спрайта
        self.loadingSprite.setScale(scaleX, scaleY);
        self.loadingSprite.play(this.keyAnimation);
    }

    deleteLoadFromScreen(self) {
        self.loadingSprite.stop();
        self.loadingSprite.destroy();
    }

    static LOADING = 'loading'
}