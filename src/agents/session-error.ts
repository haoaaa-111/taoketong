export class SessionGenerationError extends Error {
    constructor(message: string, public readonly details: { code: string; suggestion: string }) {
        super(message);
        this.name = 'SessionGenerationError';
    }
}
