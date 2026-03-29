const{createClient}=require("redis");
const logger = require("./logger");

const redisClient=createClient({
    url:process.env.REDIS_URL
});

redisClient.on("error", (err) => {
  logger.error(`[REDIS ERROR] ${err.message}`);
  console.error("[REDIS ERROR]", err);
});

(async () => {
  await redisClient.connect();
  logger.info("[REDIS] Connected");
  console.log("[REDIS] Connected");
})();

module.exports = redisClient;
