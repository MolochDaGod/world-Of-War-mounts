import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const configFile = fileURLToPath(new URL('../vite.config.ts', import.meta.url));
const server = await createServer({
  configFile,
  server: { middlewareMode: true },
});

try {
  const catalog = await server.ssrLoadModule('/src/showcase/showcaseCatalog.ts');
  const factionData = await server.ssrLoadModule('/src/game/data/FactionData.ts');

  const unitSubjects = catalog.SHOWCASE_SUBJECTS.filter((subject: { kind: string }) => subject.kind === 'unit');
  const rosterCount = Object.values(factionData.FACTION_UNITS)
    .flat()
    .length;

  assert.equal(
    unitSubjects.length,
    rosterCount,
    'every faction roster entry must receive a dedicated showcase subject',
  );
  assert.equal(
    new Set(unitSubjects.map((subject: { id: string }) => subject.id)).size,
    rosterCount,
    'every unit showcase subject must have a unique archive identifier',
  );

  for (const subject of catalog.SHOWCASE_SUBJECTS) {
    assert.ok(subject.alliance, `${subject.name} is missing its alliance identity`);
    assert.ok(catalog.SHOWCASE_RACE_COLORS[subject.race], `${subject.name} is missing a faction accent color`);
    assert.ok(subject.shots.length > 0, `${subject.name} has no playable showcase take`);
    assert.ok(subject.shots.some((shot: { id: string }) => shot.id === 'idle'), `${subject.name} needs an idle take`);
    assert.ok(subject.profile.cameraDistance > 0, `${subject.name} needs adaptive camera framing`);
    assert.ok(subject.profile.plinthRadius > 0, `${subject.name} needs an adaptive stage radius`);
  }

  const meshySubject = unitSubjects.find((subject: { unitType: string }) => subject.unitType === 'meshyWarrior');
  assert.ok(meshySubject, 'the Meshy warrior must be present in the showcase');
  assert.ok(meshySubject.shots.some((shot: { id: string }) => shot.id === 'slash'), 'the Meshy warrior must expose its slash take');
  assert.ok(meshySubject.shots.some((shot: { id: string }) => shot.id === 'hook'), 'the Meshy warrior must expose its hook take');

  console.log(`Showcase catalog is valid: ${unitSubjects.length} roster subjects, ${catalog.SHOWCASE_SUBJECTS.length} total archive subjects.`);
} finally {
  await server.close();
}