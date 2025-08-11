"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = exports.db = void 0;
exports.checkDatabaseHealth = checkDatabaseHealth;
exports.closeDatabaseConnection = closeDatabaseConnection;
const postgres_js_1 = require("drizzle-orm/postgres-js");
const postgres_1 = __importDefault(require("postgres"));
const env_1 = require("../types/env");
const schema = __importStar(require("./schema"));
// Create connection pool
const connectionString = env_1.env.DATABASE_URL;
const sql = (0, postgres_1.default)(connectionString, {
    max: env_1.env.NODE_ENV === 'production' ? 20 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: env_1.env.NODE_ENV === 'production' ? 'require' : false,
});
exports.sql = sql;
// Create Drizzle instance
exports.db = (0, postgres_js_1.drizzle)(sql, {
    schema,
    logger: env_1.env.NODE_ENV === 'development',
});
// Health check function
async function checkDatabaseHealth() {
    try {
        await sql `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}
// Graceful shutdown
async function closeDatabaseConnection() {
    try {
        await sql.end();
    }
    catch (error) {
        console.error('Error closing database connection:', error);
    }
}
//# sourceMappingURL=connection.js.map