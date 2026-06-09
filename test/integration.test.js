'use strict';

/**
 * Integration tests - These tests make real API calls
 * Run with: npm run test:integration
 *
 * Note: These tests require network access and will hit real APIs
 * The iOS test uses a well-known app that should always be available
 * The Android test requires GCP_KEY environment variable to be set
 */

const assert = require('assert');
const { describe, it } = require('node:test');
const MobileAppVersions = require('../index');

describe('Integration Tests', () => {
  describe('iOS App Store', () => {
    it('should fetch iOS version for a known app (Slack)', async () => {
      const client = new MobileAppVersions();

      // Using Slack's bundle ID as it's a stable, well-known app
      const {version} = await client.getIosVersion('com.tinyspeck.chatlyio');

      assert.ok(version, 'Version should be returned');
      assert.ok(typeof version === 'string', 'Version should be a string');
      // Version should match semver-like pattern (e.g., "23.11.10" or "1.0.0")
      assert.ok(/^\d+(\.\d+)*$/.test(version), `Version "${version}" should match version pattern`);

      console.log(`✓ Slack iOS version: ${version}`);
    });

    it('should throw error for non-existent iOS app', async () => {
      const client = new MobileAppVersions();

      await assert.rejects(
        () => client.getIosVersion('com.definitely.not.a.real.app.xyz123'),
        /No iOS app found/
      );
    });
  });

  describe('Combined getVersions', () => {
    it('should return iOS version and Android error when GCP_KEY not set', async () => {
      // Skip if GCP_KEY is set (would make real Android API call)
      if (process.env.GCP_KEY) {
        console.log('Skipping: GCP_KEY is set');
        return;
      }

      const client = new MobileAppVersions();
      const result = await client.getVersions('com.tinyspeck.chatlyio');

      assert.ok(result.ios, 'iOS version should be present');
      assert.ok(result.ios.version, 'iOS version object should have version field');
      assert.ok(result.errors?.android, 'Android error should be present');

      console.log(`✓ iOS version: ${result.ios.version}`);
      console.log(`✓ Android error (expected): ${result.errors.android}`);
    });
  });
});
