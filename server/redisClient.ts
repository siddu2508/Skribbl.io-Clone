import { createClient } from 'redis';

// Use environment variables or default to localhost
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');
// For cloud deployment (Render), use REDIS_URL if available
const redisUrl = process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`;

const client = createClient({
  url: redisUrl
});

client.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
  await client.connect();
  console.log(`Connected to Redis`);
})();

export const setRoomState = async (roomId: string, data: any) => {
  await client.set(`room:${roomId}`, JSON.stringify(data));
};

export const getRoomState = async (roomId: string) => {
  const data = await client.get(`room:${roomId}`);
  return data ? JSON.parse(data) : null;
};

export const setGameState = async (roomId: string, data: any) => {
  await client.set(`game:${roomId}`, JSON.stringify(data));
};

export const getGameState = async (roomId: string) => {
  const data = await client.get(`game:${roomId}`);
  return data ? JSON.parse(data) : null;
};

export const deleteRoomData = async (roomId: string) => {
    await client.del(`room:${roomId}`);
    await client.del(`game:${roomId}`);
}

export default client;