// Import third-party dependencies
import { sound } from "@pixi/sound";
import * as PIXI from "pixi.js";

// Import dependencies
import { Actor, ScriptBehavior, Components, Timer, ProgressiveNumber, getActor } from "../ECS";
import AnimatedSpriteEx from "../ECS/components/animatedsprite.class";
import CollisionLayer from "../ECS/components/collisionLayer.class";
import { EntityBuilder, Key } from "../helpers";
import { Button } from "../helpers/input.class";

import { Inputs } from "../keys";

const kPlayerStats = {
    speed: 1,
    currentHp: 1,
    maxHp: 20
}

const kMaxHpBarLength = 75;
const kMaxHpBarX = -(kMaxHpBarLength - (kMaxHpBarLength / 2));
let kMaxHpBarY;

export default class PlayerBehavior extends ScriptBehavior {
    constructor(speed = kPlayerStats.speed, currentHp = kPlayerStats.currentHp, maxHp = kPlayerStats.maxHp) {
        super({
            currentHp: "player.currentHp",
            maxHp: "player.maxHp"
        });

        this.currentHp = currentHp;
        this.maxHp = maxHp;
        this.playable = true;

        this.time = new Timer(60);
        this.speed = new ProgressiveNumber(speed, speed * 2, {
            easing: "easeInQuad", frame: 90
        });
    }

    teleport(position) {
        console.log("player teleport at: ", position);
        this.playable = false;

        game.fade.auto(() => {
            game.fade.centerPosition = position;

            this.actor.pos = position;
            game.viewport.moveCenter(this.actor.x, this.actor.y);
            this.playable = true;
        });
    }

    awake() {
        {
            const spriteComponent = new Components.AnimatedSpriteEx("adventurer", {
                defaultAnimation: "adventurer-idle"
            });
            spriteComponent.anchor.set(0.5, 1);
            spriteComponent.oneToMany("idle", ["adventurer-idle", "adventurer-idle-2"]);

            /** @type {AnimatedSpriteEx} */
            this.sprite = this.actor.addComponent(spriteComponent);


            kMaxHpBarY = -(this.sprite.height + 10);
            const maxHpBar = new PIXI.Graphics()
                .beginFill(PIXI.utils.string2hex("#666"), 1)
                .drawRect(kMaxHpBarX, kMaxHpBarY, kMaxHpBarLength, 10)
                .endFill();

            const hpBar = new PIXI.Graphics()
                .beginFill(PIXI.utils.string2hex("#FF0000"), 1)
                .drawRect(kMaxHpBarX, kMaxHpBarY, 4, 10)
                .endFill();

            maxHpBar.addChild(hpBar);

            this.actor.addChild(maxHpBar);
            console.log(this.actor.children[1].children[0]);
        }

        this.deathSound = sound.find("death");
        this.deathSound.volume = 0.1;
    }

    start() {
        const map = getActor("map") || getActor("start_room");
        if (map) {
            const spawn = map.findChild("spawn", true);
            if (spawn) {
                this.actor.pos = spawn.centerPosition;
            }

            /** @type {CollisionLayer} */
            this.collision = map.getComponent(Components.Types.TiledMap).collision;
        }

        game.viewport.moveCenter(this.actor.x, this.actor.y);
        game.viewport.follow(this.actor, {
            speed: 1.5,
            acceleration: 0.01,
            radius: 40,
        });
    }

    update() {
        game.fade.centerPosition = this.actor.pos;

        if (!this.playable) {
            return;
        }
        if (this.time.walk() && this.currentHp < this.maxHp) {
            this.currentHp += 1;
        }

        this.actor.children[1].children[0].clear()
            .beginFill(PIXI.utils.string2hex("#FF0000"), 1)
            .drawRect(kMaxHpBarX, kMaxHpBarY, this.currentHp * 5, 10)
            .endFill();

        const neighbours = this.collision.getNeighBourWalkable(this.actor.x, this.actor.y);
        const isLeftWalkable = !neighbours.left || neighbours.right;
        const isRightWalkable = !neighbours.right || neighbours.left;
        const isTopWalkable = !neighbours.top || neighbours.bottom;
        const isBottomWalkable = !neighbours.bottom || neighbours.top;

        const currentSpeed = this.speed.walk(!this.actor.moving);
        if (Inputs.left() && isLeftWalkable) {
            this.actor.moveX(-currentSpeed);
            this.sprite.scale.x = -1;
        }
        else if (Inputs.right() && isRightWalkable) {
            this.actor.moveX(currentSpeed);
            this.sprite.scale.x = 1;
        }
        if (Inputs.up() && isTopWalkable) {
            this.actor.moveY(-currentSpeed);
        }
        else if (Inputs.down() && isBottomWalkable) {
            this.actor.moveY(currentSpeed);
        }

        if (game.input.wasKeyJustPressed(Key.L) || game.input.wasGamepadButtonJustPressed(Button.SELECT)) {
            this.sprite.playAnimation("adventurer-die", { loop: false });
            // this.sprite.lock();
            if (!this.deathSound.isPlaying) {
                this.deathSound.play();
            }
        }

        this.sprite.playAnimation(this.actor.moving ? "adventurer-run" : "idle");
        this.actor.applyVelocity();
    }
}

ScriptBehavior.define("PlayerBehavior", PlayerBehavior);

EntityBuilder.define("actor:player", () => {
    return new Actor("player")
        .createScriptedBehavior("PlayerBehavior");
});
