/**
 * Tracks visualization items that exist only for the current editor session.
 * Preview items are intentionally kept outside SceneManager.objects so the
 * persistence and command systems never serialize them.
 */
export class VisualPreviewManager {
    constructor(sceneManager, onChange = null) {
        this.sceneManager = sceneManager;
        this.items = [];
        this.onChange = onChange;
    }

    createEffect(type, config) {
        const effect = this.sceneManager.vfxManager.createEffect(type, config);
        if (!effect) return null;

        this.items.push({ kind: 'effect', id: effect.id });
        this.notifyChange();
        return effect;
    }

    createLabel(config) {
        const id = this.sceneManager.labelManager.createLabel(config);
        if (!id) return null;

        this.items.push({ kind: 'label', id });
        this.notifyChange();
        return id;
    }

    clear() {
        for (const item of this.items) {
            if (item.kind === 'effect') {
                this.sceneManager.vfxManager.removeEffect(item.id);
            } else if (item.kind === 'label') {
                this.sceneManager.labelManager.removeLabel(item.id);
            }
        }

        this.items = [];
        this.notifyChange();
    }

    get count() {
        return this.items.length;
    }

    notifyChange() {
        this.onChange?.(this.count);
    }
}
