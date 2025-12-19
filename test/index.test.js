'use strict';

const assert = require('assert');
const { describe, it, beforeEach, mock } = require('node:test');
const MobileAppVersions = require('../index');

describe('MobileAppVersions', () => {
  describe('Constructor', () => {
    it('should create instance with default values', () => {
      const client = new MobileAppVersions();
      assert.ok(client);
      assert.strictEqual(client.googleAuthUrl, 'https://oauth2.googleapis.com/token');
      assert.strictEqual(client.itunesUrl, 'https://itunes.apple.com/lookup');
      assert.strictEqual(client.androidPublisherUrl, 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications');
    });

    it('should accept custom options', () => {
      const client = new MobileAppVersions({
        gcpKey: 'test-key',
        googleAuthUrl: 'https://custom-auth.com',
        itunesUrl: 'https://custom-itunes.com',
        androidPublisherUrl: 'https://custom-publisher.com',
      });

      assert.strictEqual(client.gcpKey, 'test-key');
      assert.strictEqual(client.googleAuthUrl, 'https://custom-auth.com');
      assert.strictEqual(client.itunesUrl, 'https://custom-itunes.com');
      assert.strictEqual(client.androidPublisherUrl, 'https://custom-publisher.com');
    });
  });

  describe('getIosVersion', () => {
    it('should throw error when bundleId is not provided', async () => {
      const client = new MobileAppVersions();
      await assert.rejects(
        () => client.getIosVersion(),
        { message: 'bundleId is required' }
      );
    });

    it('should throw error when bundleId is empty string', async () => {
      const client = new MobileAppVersions();
      await assert.rejects(
        () => client.getIosVersion(''),
        { message: 'bundleId is required' }
      );
    });
  });

  describe('getAndroidVersion', () => {
    it('should throw error when bundleId is not provided', async () => {
      const client = new MobileAppVersions();
      await assert.rejects(
        () => client.getAndroidVersion(),
        { message: 'bundleId is required' }
      );
    });

    it('should throw error when GCP_KEY is not configured', async () => {
      const client = new MobileAppVersions();
      await assert.rejects(
        () => client.getAndroidVersion('com.example.app'),
        { message: /GCP_KEY is required/ }
      );
    });
  });

  describe('getVersions', () => {
    it('should throw error when bundleId is not provided', async () => {
      const client = new MobileAppVersions();
      await assert.rejects(
        () => client.getVersions(),
        { message: 'bundleId is required' }
      );
    });
  });

  describe('getVersionsForMultipleBundles', () => {
    it('should throw error when bundleIds is not an array', async () => {
      const client = new MobileAppVersions();
      await assert.rejects(
        () => client.getVersionsForMultipleBundles('not-an-array'),
        { message: 'bundleIds must be a non-empty array' }
      );
    });

    it('should throw error when bundleIds is empty array', async () => {
      const client = new MobileAppVersions();
      await assert.rejects(
        () => client.getVersionsForMultipleBundles([]),
        { message: 'bundleIds must be a non-empty array' }
      );
    });
  });

  describe('Module exports', () => {
    it('should export MobileAppVersions class', () => {
      assert.strictEqual(typeof MobileAppVersions, 'function');
    });

    it('should export createClient factory function', () => {
      const { createClient } = require('../index');
      assert.strictEqual(typeof createClient, 'function');

      const client = createClient();
      assert.ok(client instanceof MobileAppVersions);
    });

    it('should export named MobileAppVersions', () => {
      const { MobileAppVersions: NamedExport } = require('../index');
      assert.strictEqual(typeof NamedExport, 'function');
    });
  });

  describe('Convenience methods', () => {
    it('should have ios() method', () => {
      const client = new MobileAppVersions();
      assert.strictEqual(typeof client.ios, 'function');
    });

    it('should have android() method', () => {
      const client = new MobileAppVersions();
      assert.strictEqual(typeof client.android, 'function');
    });
  });
});

