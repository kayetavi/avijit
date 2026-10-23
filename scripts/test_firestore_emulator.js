import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import fs from 'fs';
import path from 'path';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8088';

const PROJECT_ID = 'loginapp-feb72';

async function runEmulatorTests() {
  console.log('=== KayetDMS Firestore Emulator Unit Test Suite ===');
  console.log(`Connecting to Firestore Emulator on ${process.env.FIRESTORE_EMULATOR_HOST} for project: ${PROJECT_ID}...`);

  const rulesContent = fs.readFileSync(path.resolve('./firestore.rules'), 'utf8');

  let testEnv;
  try {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: rulesContent,
        host: '127.0.0.1',
        port: 8088,
      },
    });
  } catch (err) {
    console.error('Failed to initialize test environment:', err.message);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  async function test(description, testFn) {
    try {
      await testFn();
      console.log(` [PASS] ${description}`);
      passed++;
    } catch (err) {
      console.error(` [FAIL] ${description}`);
      console.error(`        Error: ${err.message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. ANONYMOUS ACCESS TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 1: Anonymous Access Restrictions ---');
    const anonDb = testEnv.unauthenticatedContext().firestore();

    await test('Anonymous user CANNOT read protected collections (/users)', async () => {
      await assertFails(anonDb.collection('users').doc('some-user').get());
    });

    await test('Anonymous user CANNOT read /analyses', async () => {
      await assertFails(anonDb.collection('analyses').doc('10-P-101').get());
    });

    await test('Anonymous user CANNOT write to /analyses', async () => {
      await assertFails(anonDb.collection('analyses').doc('10-P-101').set({ tMin: 5 }));
    });

    await test('Anonymous user CANNOT read /systemAuditLogs', async () => {
      await assertFails(anonDb.collection('systemAuditLogs').get());
    });

    await test('Anonymous user CAN submit valid public contact form (/contactSubmissions)', async () => {
      await assertSucceeds(
        anonDb.collection('contactSubmissions').doc('sub-anon-1').set({
          name: 'Jane Public',
          email: 'jane@example.com',
          message: 'General inquiry regarding service.',
        })
      );
    });

    await test('Anonymous user CANNOT submit contact form with trusted system fields (status)', async () => {
      await assertFails(
        anonDb.collection('contactSubmissions').doc('sub-anon-2').set({
          name: 'Attacker',
          email: 'att@example.com',
          message: 'Trying to bypass',
          status: 'PROCESSED',
        })
      );
    });

    await test('Anonymous user CANNOT read submitted contact forms', async () => {
      await assertFails(anonDb.collection('contactSubmissions').doc('sub-anon-1').get());
    });

    // -------------------------------------------------------------------------
    // 2. USER SESSION & OWNERSHIP TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 2: User Session & Ownership Restrictions ---');
    const user1Uid = 'user-uid-123';
    const user1Email = 'engineer1@example.com';
    const user1Db = testEnv.authenticatedContext(user1Uid, {
      email: user1Email,
      email_verified: true,
    }).firestore();

    const user2Uid = 'user-uid-456';
    const user2Db = testEnv.authenticatedContext(user2Uid, {
      email: 'user2@example.com',
      email_verified: true,
    }).firestore();

    await test('User CAN read their own user profile (/users/user-uid-123)', async () => {
      await assertSucceeds(user1Db.collection('users').doc(user1Uid).get());
    });

    await test('User CANNOT read another user profile (/users/user-uid-456)', async () => {
      await assertFails(user1Db.collection('users').doc(user2Uid).get());
    });

    await test('User CAN create their own user profile as viewer', async () => {
      await assertSucceeds(
        user1Db.collection('users').doc(user1Uid).set({
          name: 'Engineer One',
          role: 'viewer',
        })
      );
    });

    await test('User CANNOT elevate role to admin during profile creation', async () => {
      await assertFails(
        user2Db.collection('users').doc(user2Uid).set({
          name: 'Attacker',
          role: 'admin',
        })
      );
    });

    await test('User CAN create and manage their own session (/userSessions)', async () => {
      await assertSucceeds(
        user1Db.collection('userSessions').doc(user1Uid).set({
          uid: user1Uid,
          email: user1Email,
          loginTime: new Date().toISOString(),
        })
      );
    });

    await test('User CANNOT delete another user session', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('userSessions').doc(user2Uid).set({
          uid: user2Uid,
          email: 'user2@example.com',
        });
      });
      await assertFails(user1Db.collection('userSessions').doc(user2Uid).delete());
    });

    // -------------------------------------------------------------------------
    // 3. ROLE-BASED ACCESS CONTROL (RBAC) TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 3: Role-Based Access Control (RBAC) ---');

    // Seed roles in userRoles
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('userRoles').doc('lead_eng@example.com').set({ role: 'lead_engineer' });
      await db.collection('userRoles').doc('engineer@example.com').set({ role: 'engineer' });
      await db.collection('userRoles').doc('inspector@example.com').set({ role: 'inspector' });
      await db.collection('userRoles').doc('viewer@example.com').set({ role: 'viewer' });
    });

    const leadEngDb = testEnv.authenticatedContext('lead-uid', {
      email: 'lead_eng@example.com',
      email_verified: true,
    }).firestore();

    const engineerDb = testEnv.authenticatedContext('eng-uid', {
      email: 'engineer@example.com',
      email_verified: true,
    }).firestore();

    const inspectorDb = testEnv.authenticatedContext('insp-uid', {
      email: 'inspector@example.com',
      email_verified: true,
    }).firestore();

    const viewerDb = testEnv.authenticatedContext('viewer-uid', {
      email: 'viewer@example.com',
      email_verified: true,
    }).firestore();

    const adminDb = testEnv.authenticatedContext('admin-uid', {
      email: 'avijitkayet97@gmail.com',
      email_verified: true,
    }).firestore();

    // Catalog write permissions
    await test('Lead Engineer CAN write to /damageMechanisms catalog', async () => {
      await assertSucceeds(
        leadEngDb.collection('damageMechanisms').doc('DM-01').set({ name: 'Thinning' })
      );
    });

    await test('Engineer CANNOT write to /damageMechanisms catalog', async () => {
      await assertFails(
        engineerDb.collection('damageMechanisms').doc('DM-02').set({ name: 'Cracking' })
      );
    });

    await test('Viewer CANNOT write to /damageMechanisms catalog', async () => {
      await assertFails(
        viewerDb.collection('damageMechanisms').doc('DM-03').set({ name: 'Pitting' })
      );
    });

    // Operational calculation write permissions (isEngineerOrAbove: admin, lead, eng, inspector)
    await test('Engineer CAN write to /analyses', async () => {
      await assertSucceeds(
        engineerDb.collection('analyses').doc('10-P-101').set({
          tag: '10-P-101',
          tMin: 4.5,
        })
      );
    });

    await test('Inspector CAN write to /structural_thickness_assessments', async () => {
      await assertSucceeds(
        inspectorDb.collection('structural_thickness_assessments').doc('STA-001').set({
          tag: 'STA-001',
          status: 'Passed',
        })
      );
    });

    await test('Viewer CANNOT write to /analyses', async () => {
      await assertFails(
        viewerDb.collection('analyses').doc('10-P-102').set({
          tag: '10-P-102',
          tMin: 3.2,
        })
      );
    });

    await test('Viewer CANNOT write to /semi_quantitative_risk_assessments', async () => {
      await assertFails(
        viewerDb.collection('semi_quantitative_risk_assessments').doc('SQRA-01').set({
          score: 12,
        })
      );
    });

    // Role Escalation Protection
    await test('Engineer CANNOT write to /userRoles to elevate permissions', async () => {
      await assertFails(
        engineerDb.collection('userRoles').doc('engineer@example.com').set({ role: 'admin' })
      );
    });

    await test('Super Admin CAN write to /userRoles', async () => {
      await assertSucceeds(
        adminDb.collection('userRoles').doc('newuser@example.com').set({ role: 'engineer' })
      );
    });

    // -------------------------------------------------------------------------
    // 4. AUDIT LOG IMMUTABILITY & WILDCARD ACCESS TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 4: Audit Log Immutability & Wildcard Safety ---');

    await test('Authenticated user CAN create an audit log (/systemAuditLogs)', async () => {
      await assertSucceeds(
        engineerDb.collection('systemAuditLogs').doc('log-101').set({
          action: 'ANALYSIS_CREATED',
          timestamp: new Date().toISOString(),
          user: 'engineer@example.com',
        })
      );
    });

    await test('Authenticated user CANNOT update an audit log (Immutable)', async () => {
      await assertFails(
        engineerDb.collection('systemAuditLogs').doc('log-101').update({
          action: 'TAMPERED',
        })
      );
    });

    await test('Super Admin CANNOT delete an audit log (Immutable)', async () => {
      await assertFails(
        adminDb.collection('systemAuditLogs').doc('log-101').delete()
      );
    });

    await test('Viewer CANNOT read audit logs', async () => {
      await assertFails(viewerDb.collection('systemAuditLogs').get());
    });

    await test('Admin CAN read audit logs', async () => {
      await assertSucceeds(adminDb.collection('systemAuditLogs').get());
    });

    await test('Authenticated user CANNOT access unknown wildcard collections (/secret_vault)', async () => {
      await assertFails(engineerDb.collection('secret_vault').doc('doc-1').get());
    });

  } finally {
    await testEnv.cleanup();
  }

  console.log('\n=== Emulator Test Execution Summary ===');
  console.log(` Total Tests: ${passed + failed}`);
  console.log(` Passed:      ${passed}`);
  console.log(` Failed:      ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runEmulatorTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
