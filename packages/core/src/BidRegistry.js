const BID_PREFIX = 'bid_';

/** Creates a scene-node business id independent from THREE.Object3D.uuid. */
export function generateBid() {
    if (globalThis.crypto?.randomUUID) {
        return `${BID_PREFIX}${globalThis.crypto.randomUUID()}`;
    }

    const random = Math.random().toString(36).slice(2);
    return `${BID_PREFIX}${Date.now().toString(36)}_${random}`;
}

/** Scene-wide index and uniqueness guard for persistent business ids. */
export class BidRegistry {
    constructor() {
        this.byBid = new Map();
        this.byObject = new WeakMap();
    }

    register(object) {
        const bid = object?.userData?.bid;
        if (!bid) throw new Error('Cannot register an Object3D without userData.bid');

        const existing = this.byBid.get(bid);
        if (existing && existing !== object) {
            throw new Error(`Duplicate scene bid: ${bid}`);
        }

        this.byBid.set(bid, object);
        this.byObject.set(object, bid);
        return bid;
    }

    registerTree(root) {
        root?.traverse((object) => this.register(object));
    }

    unregister(object) {
        const bid = this.getBid(object);
        if (bid && this.byBid.get(bid) === object) this.byBid.delete(bid);
        if (object) this.byObject.delete(object);
    }

    unregisterTree(root) {
        root?.traverse((object) => this.unregister(object));
    }

    getObject(bid) {
        return this.byBid.get(bid) ?? null;
    }

    getBid(object) {
        return this.byObject.get(object) ?? object?.userData?.bid ?? null;
    }

    has(bid) {
        return this.byBid.has(bid);
    }

    clear() {
        this.byBid.clear();
        this.byObject = new WeakMap();
    }
}
