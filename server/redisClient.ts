import { createClient } from 'redis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');
const redisUrl = process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`;

const client = createClient({ url: redisUrl });

client.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
  await client.connect();
  console.log(`Connected to Redis at ${redisUrl}`);
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