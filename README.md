# Redis Manager

The Redis Manager provides a reusable utility for interacting with Redis. It supports features such as adding, updating, retrieving, deleting, and debugging data with Redis tables and keys.

## Features

- Dynamic table and key-based data management.
- Supports both expiry and no-expiry data operations.
- Debugging utility to print all Redis data.
- Easy integration into other Node.js services.

---

## Installation

Install the Redis Manager in your service project:

### From NPM (if published):

```bash
npm install git+https:#github.com/your-username/redis-manager.git
```

## Configuration

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=yourpassword

```bash
const redisClient = require("redis-manager");

await redisClient.addOrUpdateNoExpiry("users", "key123", { name: "John", age: 30 });

```

```bash
const RedisManager = require("./src/index");

#Create an instance of RedisManager
const redisManager = new RedisManager({
    host: "localhost",
    port: 6379,
    password: null, # Optional
});

(async () => {
    try {
        # Add data without expiry
        await redisManager.addOrUpdateNoExpiry("users", "key123", { name: "John Doe", age: 30 });
        console.log("Data added successfully!");

        # Fetch data by key
        const data = await redisManager.getByKey("users", "key123");
        console.log("Retrieved data:", data);

        # Fetch all data in the table
        const allData = await redisManager.getAll("users");
        console.log("All users:", allData);

        # Set expiry for the table
        await redisManager.setExpiry("users", 3600);
        console.log("Expiry set successfully!");

        # Debug all Redis data
        await redisManager.debugAll();

        # Delete a specific key
        await redisManager.deleteByKey("users", "key123");
        console.log("Key deleted successfully!");

        # Delete all data in the table
        await redisManager.deleteAll("users");
        console.log("Table deleted successfully!");
    } catch (error) {
        console.error("Error:", error);
    }
})();
```
