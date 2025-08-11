import pino from 'pino';
import { env } from '../types/env';

const loggerConfig = {
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development' 
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
    level: (label: string) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
};

const mainLogger = pino(loggerConfig);

export function createLogger(service: string) {
  return mainLogger.child({ service });
}

export { mainLogger as logger };