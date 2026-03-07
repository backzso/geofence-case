import { PrismaClient } from './src/infrastructure/persistence/generated';

const prisma = new PrismaClient();

async function run() {
  await prisma.$connect();
  try {
    const rows = await prisma.$transaction(async (tx) => {
      // test whether SET search_path makes a difference
      // await tx.$executeRawUnsafe(`SET LOCAL search_path TO geofence, public;`);
      return tx.$queryRaw`
        INSERT INTO geofence.areas (name, geom)
        VALUES (
          'test',
          public.ST_Buffer(
            public.ST_SetSRID(public.ST_MakePoint(32.8, 39.9), 4326)::public.geography,
            300
          )::public.geometry
        )
        RETURNING id, name, created_at
      `;
    });
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
