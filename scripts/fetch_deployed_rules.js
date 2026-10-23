import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';

async function main() {
  try {
    const auth = new GoogleAuth({
      keyFilename: '/tmp/sa_key.json',
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const projectId = 'loginapp-feb72';

    // Get the active release for Cloud Firestore
    console.log(`Fetching active release for project ${projectId}...`);
    const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`;
    const releaseRes = await client.request({ url: releaseUrl });

    console.log('Release info:', JSON.stringify(releaseRes.data, null, 2));

    const rulesetName = releaseRes.data.rulesetName;
    if (!rulesetName) {
      console.error('No rulesetName found in release.');
      return;
    }

    console.log(`Fetching ruleset source for: ${rulesetName}...`);
    const rulesetUrl = `https://firebaserules.googleapis.com/v1/${rulesetName}`;
    const rulesetRes = await client.request({ url: rulesetUrl });

    const files = rulesetRes.data.source?.files;
    if (files && files.length > 0) {
      const deployedRules = files[0].content;
      fs.writeFileSync('/tmp/deployed_firestore.rules', deployedRules);
      console.log('SUCCESS: Deployed rules saved to /tmp/deployed_firestore.rules');
    } else {
      console.error('No rules source files found in ruleset.');
    }
  } catch (err) {
    console.error('API Error:', err.message);
    if (err.response?.data) {
      console.error('Response data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

main();
