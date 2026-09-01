const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_HISTORY_MESSAGES = 30;

class MemorySessionStore {
    constructor() {
        this.sessions = new Map();
        this.cleanupTimer = setInterval(() => this.cleanup(), 10 * 60 * 1000);
        this.cleanupTimer.unref?.();
    }

    get(sessionId) {
        let session = this.sessions.get(sessionId);
        if (!session) {
            session = { messages: [], updatedAt: Date.now() };
            this.sessions.set(sessionId, session);
        }
        session.updatedAt = Date.now();
        return session;
    }

    append(sessionId, message) {
        const session = this.get(sessionId);
        session.messages.push(message);
        session.messages = session.messages.slice(-MAX_HISTORY_MESSAGES);
        session.updatedAt = Date.now();
    }

    getMessages(sessionId) {
        return [...this.get(sessionId).messages];
    }

    delete(sessionId) {
        this.sessions.delete(sessionId);
    }

    cleanup() {
        const expiresBefore = Date.now() - SESSION_TTL_MS;
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.updatedAt < expiresBefore) this.sessions.delete(sessionId);
        }
    }
}

module.exports = new MemorySessionStore();
