"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
const env_1 = require("../types/env");
const loggerConfig = {
    level: env_1.env.LOG_LEVEL,
    transport: env_1.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            }
        }
        : undefined,
    formatters: {
        level: (label) => ({ level: label }),
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    serializers: {
        error: pino_1.default.stdSerializers.err,
        req: pino_1.default.stdSerializers.req,
        res: pino_1.default.stdSerializers.res,
    },
};
const mainLogger = (0, pino_1.default)(loggerConfig);
exports.logger = mainLogger;
function createLogger(service) {
    return mainLogger.child({ service });
}
//# sourceMappingURL=logger.js.map