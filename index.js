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
    async addOrUpdateTableWithNoTableExpiry(table, key, data) {
        const jsonData = JSON.stringify(data);
        await this.redis.hset(table, key, jsonData);
    }

    /**
     * Adds or updates data in a specific table with a TTL for the entire table.
     * @param {string} table - The table name (e.g., "users", "orders").
     * @param {string} key - The unique key.
     * @param {Object} data - The data to associate with the key.
     * @param {number} ttl - The time-to-live for the table in seconds.
     * @returns {Promise<void>}
     */
    async addOrUpdateTableWithTableExpiry(table, key, data, ttl) {
        const jsonData = JSON.stringify(data);
        await this.redis.hset(table, key, jsonData);
        await this.redis.expire(table, ttl);
    }

    /**
     * Adds or updates a key-value pair in Redis with a TTL.
     * The key is dynamically created as "table-key" within this method.
     * @param {string} table - The table name (e.g., "orders", "users").
     * @param {string} key - The unique key within the table (e.g., "alex").
     * @param {string|Object} value - The value to store. If it's an object, it will be stringified.
     * @param {number} ttl - The time-to-live for the key in seconds.
     * @returns {Promise<void>}
     */
    async addOrUpdateCompositeKeyPatternWithExpiry(table, key, value, ttl) {
        const compositeKey = `${table}-${key}`;
        const data = typeof value === "object" ? JSON.stringify(value) : value;
        /* Use SET with EX option to store the value and set expiry in one call */
        await this.redis.set(compositeKey, data, "EX", ttl);
    }

    /**
     * Adds or updates a key-value pair in Redis without a TTL.
     * The key is dynamically created as "table-key" within this method.
     * @param {string} table - The table name (e.g., "orders", "users").
     * @param {string} key - The unique key within the table (e.g., "alex").
     * @param {string|Object} value - The value to store. If it's an object, it will be stringified.
     * @returns {Promise<void>}
     */
    async addOrUpdateCompositeKeyPatternNoExpiry(table, key, value) {
        const compositeKey = `${table}-${key}`;
        const data = typeof value === "object" ? JSON.stringify(value) : value;
        await this.redis.set(compositeKey, data);
    }

    /**
     * Fetches data for keys matching a simple `tablename-key` pattern in Redis.
     * @param {string} table - The table name (e.g., "users").
     * @param {string} pattern - The pattern to match keys (e.g., `key123` for `users-key123`).
     * @returns {Promise<Object>} An object where keys are the matched keys and values are their data.
     */
    async getAllMatchingDataByPattern(table, pattern) {
        const matchPattern = `${table}-${pattern}*`; /* Construct the pattern for SCAN */
        let cursor = "0";
        const result = {};

        do {
            /* Scan for keys matching the pattern */
            const [nextCursor, keys] = await this.redis.scan(cursor, "MATCH", matchPattern, "COUNT", 100);
            cursor = nextCursor;

            for (const key of keys) {
                const data = await this.redis.get(key);
                if (data) {
                    const field = key.replace(`${table}-`, ""); /* Remove table prefix from key */
                    result[field] = JSON.parse(data); /* Parse JSON value */
                }
            }
        } while (cursor !== "0");

        return result;
    }


    /**
     * Fetches data for a specific key in a table.
     * @param {string} table - The table name.
     * @param {string} key - The unique key.
     * @returns {Promise<Object|null>} The data associated with the key, or null if not found.
     */
    async getByTableAndKey(table, key) {
        const data = await this.redis.hget(table, key);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Fetches data for a specific key in a table using the `table:key` format.
     * @param {string} table - The table name (e.g., "users").
     * @param {string} key - The unique key within the table.
     * @returns {Promise<Object|null>} The data associated with the key, or null if not found.
     */
    async getByTableAndKeyPattern(table, key) {
        const compositeKey = `${table}:${key}`; /* Use the same composite key format */
        const data = await this.redis.get(compositeKey); /* Use GET to retrieve the value */
        return data ? JSON.parse(data) : null; /* Parse the JSON data if found */
    }

    /**
  * Fetches all data from a table.
  * @param {string} table - The table name.
  * @returns {Promise<Object>} An object where keys are the keys and values are their data.
  */
    async getAllFromTable(table) {
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
    async deleteDataByTableAndKey(table, key) {
        return await this.redis.hdel(table, key);
    }

    /**
     * Deletes a key-value pair from Redis where the key is a composite key (e.g., "table-key").
     * @param {string} table - The table name (e.g., "users", "orders").
     * @param {string} key - The unique key within the table (e.g., "123", "alex").
     * @returns {Promise<number>} The number of keys removed (1 if successful, 0 if not found).
     */
    async deleteCompositeKeyByTableKeyPattern(table, key) {
        const compositeKey = `${table}-${key}`;
        return await this.redis.del(compositeKey);
    }

    /**
     * Deletes all data in a specific table.
     * @param {string} table - The table name.
     * @returns {Promise<void>}
     */
    async deleteAllFromTable(table) {
        await this.redis.del(table);
    }

    /**
     * Sets a Time-to-Live (TTL) for a specific table.
     * @param {string} table - The table name.
     * @param {number} ttl - The time-to-live in seconds.
     * @returns {Promise<void>}
     */
    async setTableExpiry(table, ttl) {
        await this.redis.expire(table, ttl);
    }

    /**
     * Removes the expiry for a specific table, making it persist indefinitely.
     * @param {string} table - The table name.
     * @returns {Promise<void>}
     */
    async removeTableExpiry(table) {
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
