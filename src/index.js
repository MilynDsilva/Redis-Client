const Redis = require("ioredis");

class RedisManager {
    /**
     * Initialize the RedisManager with Redis connection options.
     * @param {Object} options - Redis connection options (host, port, password, etc.).
     */
    constructor(options = {}) {
        this.redis = new Redis({
            host: options.host || process.env.REDIS_HOST || "localhost",
            port: options.port || process.env.REDIS_PORT || 6379,
            password: options.password || process.env.REDIS_PASSWORD || null,
        });

        this.redis.on("connect", () => console.log("Redis connected"));
        this.redis.on("error", (err) => console.error("Redis error:", err));
    }

    /**
     * Adds or updates data in a specific table with no expiry.
     * @param {string} table - The table name (e.g., "users", "orders").
     * @param {string} key - The unique key.
     * @param {Object} data - The data to associate with the key.
     * @returns {Promise<void>}
     */
    async addOrUpdateNoExpiry(table, key, data) {
        const jsonData = JSON.stringify(data);
        await this.redis.hset(table, key, jsonData);
    }

    /**
     * Adds or updates data in a specific table with a TTL.
     * @param {string} table - The table name (e.g., "users", "orders").
     * @param {string} key - The unique key.
     * @param {Object} data - The data to associate with the key.
     * @param {number} ttl - The time-to-live for the table in seconds.
     * @returns {Promise<void>}
     */
    async addOrUpdateWithExpiry(table, key, data, ttl) {
        const jsonData = JSON.stringify(data);
        await this.redis.hset(table, key, jsonData);
        await this.redis.expire(table, ttl);
    }

    /**
     * Fetches data for a specific key in a table.
     * @param {string} table - The table name.
     * @param {string} key - The unique key.
     * @returns {Promise<Object|null>} The data associated with the key, or null if not found.
     */
    async getByKey(table, key) {
        const data = await this.redis.hget(table, key);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Fetches all data in a table.
     * @param {string} table - The table name.
     * @returns {Promise<Object>} An object where keys are the keys and values are their data.
     */
    async getAll(table) {
        const rawData = await this.redis.hgetall(table);
        const parsedData = {};
        for (const [key, value] of Object.entries(rawData)) {
            parsedData[key] = JSON.parse(value);
        }
        return parsedData;
    }

    /**
     * Deletes data for a specific key in a table.
     * @param {string} table - The table name.
     * @param {string} key - The unique key.
     * @returns {Promise<number>} The number of fields removed.
     */
    async deleteByKey(table, key) {
        return await this.redis.hdel(table, key);
    }

    /**
     * Deletes all data in a specific table.
     * @param {string} table - The table name.
     * @returns {Promise<void>}
     */
    async deleteAll(table) {
        await this.redis.del(table);
    }

    /**
     * Sets a Time-to-Live (TTL) for a specific table.
     * @param {string} table - The table name.
     * @param {number} ttl - The time-to-live in seconds.
     * @returns {Promise<void>}
     */
    async setExpiry(table, ttl) {
        await this.redis.expire(table, ttl);
    }

    /**
     * Removes the expiry for a specific table, making it persist indefinitely.
     * @param {string} table - The table name.
     * @returns {Promise<void>}
     */
    async removeExpiry(table) {
        await this.redis.persist(table);
    }

    /**
     * Prints all data in Redis grouped by tables (keys) and their respective data.
     * @returns {Promise<void>}
     */
    async debugAll() {
        let cursor = "0";
        const result = {};

        console.log("Starting debug of all Redis data...");

        do {
            const [nextCursor, keys] = await this.redis.scan(cursor, "MATCH", "*", "COUNT", 100);
            cursor = nextCursor;

            for (const key of keys) {
                const type = await this.redis.type(key);

                if (type === "hash") {
                    const hashData = await this.redis.hgetall(key);
                    result[key] = hashData;
                } else if (type === "string") {
                    const value = await this.redis.get(key);
                    result[key] = value;
                } else if (type === "list") {
                    const listData = await this.redis.lrange(key, 0, -1);
                    result[key] = listData;
                } else if (type === "set") {
                    const setData = await this.redis.smembers(key);
                    result[key] = setData;
                } else if (type === "zset") {
                    const zsetData = await this.redis.zrange(key, 0, -1, "WITHSCORES");
                    result[key] = zsetData;
                } else {
                    result[key] = `Unsupported type: ${type}`;
                }
            }
        } while (cursor !== "0");

        console.log("Redis Data Dump:");
        console.log(JSON.stringify(result, null, 2));
    }
}

module.exports = RedisManager;
