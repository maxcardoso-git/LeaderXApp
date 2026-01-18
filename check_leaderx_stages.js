import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

try {
  const pipeline = await prisma.pipeline.findFirst({
    where: { key: 'recupera-credito' },
    include: { stages: { orderBy: { order: 'asc' } } }
  });

  if (!pipeline) {
    console.log('Pipeline "recupera-credito" not found');

    // List all pipelines
    const allPipelines = await prisma.pipeline.findMany({
      select: { key: true, name: true }
    });
    console.log('\nAvailable pipelines:');
    allPipelines.forEach(p => console.log('  -', p.key, '|', p.name));
  } else {
    console.log('Pipeline:', pipeline.name, '(key:', pipeline.key + ')');
    console.log('\nStages:');
    pipeline.stages.forEach(s => {
      console.log('  Key:', s.key, '| Name:', s.name);
    });
  }
} finally {
  await prisma.$disconnect();
}
