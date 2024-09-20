export function createUIBottom(self) {
    const uiContainer = self.add.dom(self.cameras.main.width / 2, self.cameras.main.height).createFromHTML(`
        <div style="text-align: center;background:#0F0920;height: 24px; width: 1280px">
        </div>
    `);

    uiContainer.setOrigin(0.5, 0.5);
    uiContainer.setScrollFactor(0);
}

export function createUITop(self) {
    const uiContainer = self.add.dom(self.cameras.main.width / 2, 0).createFromHTML(`
        <div style="text-align: center;background:#0F0920;height: 24px; width: 1280px">
        </div>
    `);

    uiContainer.setOrigin(0.5, 0.5);
    uiContainer.setScrollFactor(0);
}

export function createUIRight(self) {
    const uiContainer = self.add.dom(self.cameras.main.width, self.cameras.main.height / 2).createFromHTML(`
        <div style="text-align: center;background:#0F0920;height: 720px; width: 50px">
        </div>
    `);

    uiContainer.setOrigin(0.5, 0.5);
    uiContainer.setScrollFactor(0);
}

export function createUILeftMobile(context, settingsImg, exitImg, foldImg, settingX, settingY, exitX, exitY, settingsEvent, exitEvent, foldX, foldY, foldEvent) {
    const uiContainer = context.add.dom(0, context.cameras.main.height / 2).createFromHTML(`
        <div style="text-align: center;background:#0F0920;height: 720px; width: 50px">
        </div>
    `);

    uiContainer.setOrigin(0.5, 0.5);
    uiContainer.setScrollFactor(0);

    const settingsButton = context.add.image(settingX, settingY, settingsImg).setInteractive();
    const exitButton = context.add.image(exitX, exitY, exitImg).setInteractive();
    const foldButton = context.add.image(foldX, foldY, foldImg).setInteractive();

    settingsButton.setDisplaySize(100, 100);
    exitButton.setDisplaySize(100, 100);
    foldButton.setDisplaySize(100, 100);

    settingsButton.setScrollFactor(0);
    exitButton.setScrollFactor(0);
    foldButton.setScrollFactor(0);

    settingsButton.on('pointerdown', (pointer) => {
        settingsEvent(context);
    });

    exitButton.on('pointerdown', (pointer) => {
        exitEvent(context);
    });

    foldButton.on('pointerdown', (pointer) => {
        foldEvent(context);
    });
}

export function createUI(self, eventSettingsBtn, eventExitBtn, eventFoldBtn) {

    const uiContainer = self.add.dom(50, self.cameras.main.height / 2).createFromHTML(`
            <div class="container">
    <img class="game-logo" src="./assets/icon/logo.png" alt="Company Logo">
    <div class="game-buttons">
        <input class="gamebutton" id="playerFold" type="image" src="./assets/icon/fold.png" alt="Кнопка «input»">
        <input class="gamebutton" id="settingsButton" type="image" src="./assets/icon/settings.png" alt="Кнопка «input»">
        <input class="gamebutton" id="exitButton" type="image" src="./assets/icon/exit.png" alt="Кнопка «input»">
    </div>
</div>
    `);

    // Добавляем обработчик события для кнопки настроек
    const settingsButton = document.getElementById('settingsButton');
    const exitButton = document.getElementById('exitButton');
    const playerFold = document.getElementById('playerFold');

    playerFold.addEventListener('click', () => {
        eventFoldBtn(self);
    });

    settingsButton.addEventListener('click', () => {
        eventSettingsBtn(self);
    });
    exitButton.addEventListener('click', () => {
        eventExitBtn(self);
    });

    uiContainer.setOrigin(0.5, 0.5);
    uiContainer.setScrollFactor(0);
}

export function createExitMenu(self, eventLeaveBtn, eventCloseBtn, isMobile) {
    if (isMobile) {
        self.exitContainer = self.add.dom(0, 0).createFromHTML(`
            <div class="exit-container">
                <input type="image" src="./assets/button/LeaveSpaceMobile.png" alt="Leave space" class="exit-button" id="leave-space">
                <input type="image" src="./assets/button/cancel-exitMobile.png" alt="Close" class="exit-button" id="close-btn">
            </div>
            `);
        self.exitContainer.setOrigin(0.5, 0.5);
    } else {
        self.exitContainer = self.add.dom(0, 0).createFromHTML(`
            <div class="exit-container">
                <input type="image" src="./assets/button/leave-space.png" alt="Leave space" class="exit-button" id="leave-space">
                <input type="image" src="./assets/button/cancel-exit.png" alt="Close" class="exit-button" id="close-btn">
            </div>
            `);
        self.exitContainer.setOrigin(0.5, 0.5);
    }

    // self.exitContainer.setScrollFactor(0);

    const leaveBtn = document.getElementById('leave-space');
    leaveBtn.addEventListener('click', () => {
        eventLeaveBtn(self);
    });


    const closeBtn = document.getElementById('close-btn');
    closeBtn.addEventListener('click', () => {
        eventCloseBtn(self);
    });


    self.exitContainer.setVisible(false);
}

export function createAvatarDialog(self, eventConfirmBtn, eventCloseBtn, room, isMobile, nameButton) {
    let avatars;
    let nameInput;
    let nameError;
    let roomCode;
    if (nameButton == null) nameButton = 'finishEditing';
    if (isMobile) {
        self.avatarDialog = self.add.dom(self.cameras.main.width / 2, self.cameras.main.height / 2).createFromHTML(`
           <div id="avatarDialogGameMobile">
	<div id="avatarDialogLeft">
    <h5 id="roomIdMobile"></h3>
    <h2>Choose avatar</h2>
    <div id="avatarMobileContainer">
        <img src="./assets/character/man1.png" class="avatar" data-index="0">
        <img src="./assets/character/man2.png" class="avatar" data-index="1">
        <img src="./assets/character/man3.png" class="avatar" data-index="2">
        <img src="./assets/character/woman1.png" class="avatar" data-index="3">
        <img src="./assets/character/woman2.png" class="avatar" data-index="4">
        <img src="./assets/character/woman3.png" class="avatar" data-index="5">
    </div>
    </div>
    <div id="avatarDialogRight">
    <div id="usernameMobileContainer">
        <label for="usernameInput">Name</label>
        <div id="inputContainer">
            <input type="text" id="usernameInputMobile" placeholder="Enter your name">
            <img src="./assets/icon/pen.png" id="penIconMobile">
        </div>
    </div>
    <label id="incorrectNameMobile">Incorrect name
*the name must be 1-12 characters</label>
    <input type="image" src="./assets/button/${nameButton}.png" id="joinBtn">
    <input type="image" src="./assets/button/back.png" id="backBtn">
</div>
</div>
    `);
        avatars = document.querySelectorAll('#avatarMobileContainer .avatar');
        nameInput = document.getElementById('usernameInputMobile');
        nameError = document.getElementById('incorrectNameMobile');
        roomCode = document.getElementById('roomIdMobile');
        self.avatarDialog.setOrigin(0.5, 0.5);
    } else {
        self.avatarDialog = self.add.dom(self.cameras.main.width / 2, self.cameras.main.height / 2).createFromHTML(`
            <div id="avatarDialogGame">
                <h5 id="roomId"></h3>
                <h2>Choose avatar</h2>
                <div id="avatarContainer">
                    <img src="./assets/character/man1.png" class="avatar" data-index="0">
                    <img src="./assets/character/man2.png" class="avatar" data-index="1">
                    <img src="./assets/character/man3.png" class="avatar" data-index="2">
                    <img src="./assets/character/woman1.png" class="avatar" data-index="3">
                    <img src="./assets/character/woman2.png" class="avatar" data-index="4">
                    <img src="./assets/character/woman3.png" class="avatar" data-index="5">
                </div>
                <div id="usernameContainer">
                    <label for="usernameInput">Name</label>
                    <div id="inputContainer">
                        <input type="text" id="usernameInput" placeholder="Enter your name">
                        <img src="./assets/icon/pen.png" id="penIcon">
                    </div>
                </div>
                <label id="incorrectName">Incorrect name
            *the name must be 1-12 characters</label>
                <input type="image" src="./assets/button/${nameButton}.png" id="joinBtn">
                <input type="image" src="./assets/button/back.png" id="backBtn">
            </div>
                    `);
        avatars = document.querySelectorAll('#avatarContainer .avatar');
        nameInput = document.getElementById('usernameInput');
        nameError = document.getElementById('incorrectName');
        roomCode = document.getElementById('roomId');
        self.avatarDialog.setOrigin(0.5, 0.5);
    }
    self.avatarDialog.setVisible(false);




    let selectedAvatar = avatars[0]; // По умолчанию выделяем первый аватар
    let imgCount = 0;

    // Добавляем класс выделения первому аватару
    selectedAvatar.classList.add('selected');

    avatars.forEach(avatar => {
        avatar.addEventListener('click', function () {
            // Убираем класс выделения с предыдущего аватара
            selectedAvatar.classList.remove('selected');
            // Добавляем класс выделения новому аватару
            avatar.classList.add('selected');
            // Обновляем ссылку на текущий выделенный аватар
            selectedAvatar = avatar;
            imgCount = Number(avatar.dataset.index);
        });
    });

    const avatarDialogJoin = document.getElementById('joinBtn');
    avatarDialogJoin.addEventListener('click', () => {
        eventConfirmBtn(self, nameInput, nameError, imgCount);
    });

    const avatarDialogBack = document.getElementById('backBtn');
    avatarDialogBack.addEventListener('click', () => {
        eventCloseBtn(self);
    });

    if (room != null) roomCode.innerHTML = `Room number: ${room}`;
}

export function createJoystick(context, joystickBase, joystickThumb, flag, x, y) {

    context.joystickBase = context.add.image(x, y, joystickBase).setInteractive();
    context.joystickThumb = context.add.image(x, y, joystickThumb).setInteractive();

    context.joystickBase.setDisplaySize(150, 150);
    context.joystickThumb.setDisplaySize(100, 100);

    // Привязываем джойстик к экрану
    context.joystickBase.setScrollFactor(0);
    context.joystickThumb.setScrollFactor(0);


    context.joystickThumb.on('pointerdown', (pointer) => {
        flag = true;
        context.dragStartX = pointer.x;
        context.dragStartY = pointer.y;
    });

    context.input.on('pointermove', (pointer) => {
        if (flag) {
            let deltaX = pointer.x - context.dragStartX;
            let deltaY = pointer.y - context.dragStartY;
            let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            let maxDistance = 50;

            if (distance > maxDistance) {
                let angle = Math.atan2(deltaY, deltaX);
                deltaX = Math.cos(angle) * maxDistance;
                deltaY = Math.sin(angle) * maxDistance;
            }

            context.joystickThumb.setPosition(context.joystickBase.x + deltaX, context.joystickBase.y + deltaY);
        }
    });

    context.input.on('pointerup', () => {
        flag = false;
        context.joystickThumb.setPosition(context.joystickBase.x, context.joystickBase.y);
    });
}

export function createMobileXButton(context, nameButton, nameBackgorund, x, y, event, interactObj) {
    context.buttonBackground = context.add.image(x, y, nameBackgorund);
    context.mobileXButton = context.add.image(x, y, nameButton).setInteractive();

    context.buttonBackground.setDisplaySize(150, 150);
    context.mobileXButton.setDisplaySize(100, 100);

    context.mobileXButton.setVisible(false);
    context.buttonBackground.setVisible(false);

    context.mobileXButton.setScrollFactor(0);
    context.buttonBackground.setScrollFactor(0);

    context.mobileXButton.on('pointerdown', () => {
        event(context, interactObj);
    });
}

export const HEIGHT_PRESS_X = 90;

export const MAP_SETTINGS = {
    MAP_FULL1: 'mapFull1',
    MAP_FULL2: 'mapFull2',
    MAP_FULL3: 'mapFull3',
    MAP_FULL4: 'mapFull4',
    MAP_FULL5: 'mapFull5',

    MAP_SCALE_4_3: 4 / 3,
    MAP_SCALE_2: 2
}

export const CAMERA_MARGIN = {
    right: 125,
    left: -100,
    top: -12,
    bottom: 24
}

export const CAMERA_MARGIN_MOBILE = {
    right: 50,
    left: -25,
    top: -12,
    bottom: 24
}

export function isMobile() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|avantgo|blackberry|bada\/|bb|meego|mmp|mobile|opera m(ob|in)i|palm(os)?|phone|p(ixi|re)\/|plucker|pocket|psp|symbian|up\.browser|up\.link|vodafone|wap|windows ce|xda|xiino/i.test(userAgent) || /ipad|tablet|(android(?!.*mobile))/i.test(userAgent);
}