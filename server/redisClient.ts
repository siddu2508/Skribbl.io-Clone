import { createClient } from 'redis';

// Use the full URL from Render (REDIS_URL) if available
// Otherwise, build it from host/port (Docker or Local)
const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;

// Create the client with the correct URL
const client = createClient({
  url: redisUrl
});

client.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
  await client.connect();
  // Log which one we are using (masking the password if it's a full URL)
  const safeUrl = redisUrl.includes('@') ? redisUrl.split('@')[1] : redisUrl;
  console.log(`Connected to Redis at ${safeUrl}`);
})();

// ... (Rest of your helper functions remain UNCHANGED) ...
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