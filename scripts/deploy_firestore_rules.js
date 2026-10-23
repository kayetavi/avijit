import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

async function deployRules() {
  const projectId = 'loginapp-feb72';
  
  // Look for firestore.rules in cwd or current script dir or workspace root
  let rulesPath = path.resolve('firestore.rules');
  if (!fs.existsSync(rulesPath)) {
    rulesPath = path.resolve('/app/applet/firestore.rules');
  }
  if (!fs.existsSync(rulesPath)) {
    rulesPath = './firestore.rules';
  }

  if (!fs.existsSync(rulesPath)) {
    throw new Error(`Rules file not found at ${rulesPath}`);
  }

  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  console.log(`Loaded local rules file (${rulesPath}), size: ${rulesContent.length} bytes.`);

  const auth = new GoogleAuth({
    keyFilename: '/tmp/sa_key.json',
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();

  console.log(`Creating new Firestore ruleset for project: ${projectId}...`);
  const createRulesetUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`;
  
  const rulesetRequestBody = {
    source: {
      files: [
        {
          name: 'firestore.rules',
          content: rulesContent,
        },
      ],
    },
  };

  const createRes = await client.request({
    url: createRulesetUrl,
    method: 'POST',
    data: rulesetRequestBody,
  });

  const newRulesetName = createRes.data.name;
  console.log(`Successfully created ruleset: ${newRulesetName}`);

  console.log(`Updating release "cloud.firestore" to point to ${newRulesetName}...`);
  const updateReleaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`;
  
  const releaseRequestBody = {
    release: {
      name: `projects/${projectId}/releases/cloud.firestore`,
      rulesetName: newRulesetName,
    },
  };

  const releaseRes = await client.request({
    url: updateReleaseUrl,
    method: 'PATCH',
    data: releaseRequestBody,
  });

  console.log(`Release updated successfully!`);
  console.log(`Release details:`, JSON.stringify(releaseRes.data, null, 2));

  // Verification
  console.log(`Verifying deployed release...`);
  const verifyRes = await client.request({ url: updateReleaseUrl });
  console.log(`Active Release Ruleset: ${verifyRes.data.rulesetName}`);

  const activeRulesetRes = await client.request({
    url: `https://firebaserules.googleapis.com/v1/${verifyRes.data.rulesetName}`,
  });

  const deployedContent = activeRulesetRes.data.source?.files?.[0]?.content;
  if (deployedContent === rulesContent) {
    console.log(`VERIFICATION SUCCESS: Deployed rules match firestore.rules EXACTLY!`);
  } else {
    console.error(`VERIFICATION ERROR: Deployed content differs from local rules!`);
  }
}

deployRules().catch((err) => {
  console.error('Deployment Failed:', err.message);
  if (err.response?.data) {
    console.error('API Error details:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
