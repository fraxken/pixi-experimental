export * as PlayerBehavior from "./PlayerBehavior";
export * as CreatureBehavior from "./CreatureBehavior";
export * as ProjectileBehavior from "./ProjectileBehavior";

// NOTE: we only use this to force URL loading for the build
export function init() {
    console.log("[INFO] Scripted behaviors loaded");
}
