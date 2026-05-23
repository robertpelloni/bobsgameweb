export class Logger {
    constructor(name: string) {}
    info(...args: any[]) { console.log(...args); }
    warn(...args: any[]) { console.warn(...args); }
    error(...args: any[]) { console.error(...args); }
    debug(...args: any[]) { console.debug(...args); }
}
