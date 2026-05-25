export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

export class Logger {
    private level: LogLevel = LogLevel.INFO;
    constructor(private name: string) {}
    
    setLevel(level: LogLevel) { this.level = level; }
    
    info(...args: any[]) { if (this.level <= LogLevel.INFO) console.log(`[${this.name}]`, ...args); }
    warn(...args: any[]) { if (this.level <= LogLevel.WARN) console.warn(`[${this.name}]`, ...args); }
    error(...args: any[]) { if (this.level <= LogLevel.ERROR) console.error(`[${this.name}]`, ...args); }
    debug(...args: any[]) { if (this.level <= LogLevel.DEBUG) console.debug(`[${this.name}]`, ...args); }
}
