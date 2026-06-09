'use strict';

const axios = require('axios');
const jwt = require('jsonwebtoken');

// Default URLs
const DEFAULT_GOOGLE_AUTH_URL = 'https://oauth2.googleapis.com/token';
const DEFAULT_ITUNES_URL = 'https://itunes.apple.com/lookup';
const DEFAULT_ANDROID_PUBLISHER_URL = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

/**
 * MobileAppVersions - A module to fetch production versions of mobile apps from Google Play and Apple App Store
 */
class MobileAppVersions {
  /**
   * Create a MobileAppVersions instance
   * @param {Object} options - Configuration options
   * @param {string} [options.gcpKey] - Base64 encoded GCP service account key (required for Android)
   * @param {string} [options.googleAuthUrl] - Google OAuth URL (optional, has default)
   * @param {string} [options.itunesUrl] - iTunes lookup URL (optional, has default)
   * @param {string} [options.androidPublisherUrl] - Android Publisher API URL (optional, has default)
   */
  constructor(options = {}) {
    this.gcpKey = options.gcpKey || process.env.GCP_KEY;
    this.googleAuthUrl = options.googleAuthUrl || process.env.GOOGLE_AUTH_URL || DEFAULT_GOOGLE_AUTH_URL;
    this.itunesUrl = options.itunesUrl || process.env.ITUNES_URL || DEFAULT_ITUNES_URL;
    this.androidPublisherUrl = options.androidPublisherUrl || process.env.ANDROID_PUBLISHER_URL || DEFAULT_ANDROID_PUBLISHER_URL;

    this.androidPublisherApi = axios.create({
      baseURL: this.androidPublisherUrl,
    });
  }

  /**
   * Authenticate with Google to get an access token
   * @returns {Promise<string|null>} Access token or null if authentication fails
   * @private
   */
  async _authenticateGoogle() {
    if (!this.gcpKey) {
      throw new Error('GCP_KEY is required for Android version lookup. Provide it in constructor options or as an environment variable.');
    }

    try {
      const credentials = JSON.parse(
        Buffer.from(this.gcpKey, 'base64').toString('ascii')
      );
      const { client_email, private_key } = credentials;
      const now = Math.floor(Date.now() / 1000);

      const jwtClaimSet = {
        iss: client_email,
        scope: 'https://www.googleapis.com/auth/androidpublisher',
        aud: this.googleAuthUrl,
        exp: now + 3600, // 1 hour expiration
        iat: now,
      };

      const jwtToken = jwt.sign(jwtClaimSet, private_key, {
        algorithm: 'RS256',
      });

      const response = await axios.post(this.googleAuthUrl, null, {
        params: {
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwtToken,
        },
      });

      return response?.data?.access_token;
    } catch (error) {
      const errorMessage = error.response?.data?.error_description || error.message;
      throw new Error(`Failed to authenticate with Google: ${errorMessage}`);
    }
  }

  /**
   * Get the production version of an iOS app from the App Store
   * @param {string} bundleId - The iOS bundle identifier (e.g., 'com.example.app')
   * @returns {Promise<{version: string}>} The version object
   * @throws {Error} If no app or version is found
   */
  async getIosVersion(bundleId) {
    if (!bundleId) {
      throw new Error('bundleId is required');
    }

    try {
      const response = await axios.get(`${this.itunesUrl}?bundleId=${bundleId}`);

      if (!response?.data?.results?.length) {
        throw new Error(`No iOS app found for bundleId: ${bundleId}`);
      }

      const version = response?.data?.results[0]?.version;
      if (!version) {
        throw new Error(`No version found for iOS bundleId: ${bundleId}`);
      }

      return { version };
    } catch (error) {
      if (error.message.includes('bundleId')) {
        throw error;
      }
      throw new Error(`Failed to fetch iOS version for ${bundleId}: ${error.message}`);
    }
  }

  /**
   * Get the public/published production version of an Android app from Google Play
   * @param {string} bundleId - The Android package name (e.g., 'com.example.app')
   * @returns {Promise<{version: string|null, latest_release: {version: string|null, status: string|null}}>} The public/published version and the latest release (version + lifecycle state)
   * @throws {Error} If authentication fails or no releases are found
   */
  async getAndroidVersion(bundleId) {
    const releases = await this.getAndroidReleases(bundleId);

    if (!releases.length) {
      throw new Error(`No production releases found for Android bundleId: ${bundleId}`);
    }

    const highestVersionCode = (release) => Math.max(0, ...release.versionCodes.map(Number));

    // Pick the release with the highest version code (the newest), or null if none.
    const latestByVersionCode = (releaseList) => {
      let latest = null;
      for (const release of releaseList) {
        if (!latest || highestVersionCode(release) > highestVersionCode(latest)) {
          latest = release;
        }
      }
      return latest;
    };

    const latestRelease = latestByVersionCode(releases);
    const latestPublished = latestByVersionCode(
      releases.filter((release) => release.lifecycleState === 'RELEASE_LIFECYCLE_STATE_PUBLISHED'),
    );

    return {
      version: latestPublished?.version || null,
      latest_release: {version: latestRelease?.version , status: latestRelease.lifecycleState || null}
    };
  }

  /**
   * List Android production releases with their lifecycle state via the read-only releases.list endpoint
   * @param {string} bundleId - The Android package name (e.g., 'com.example.app')
   * @param {string} [track='production'] - The track to read
   * @returns {Promise<Array<{version: string, releaseName: string, lifecycleState: string, versionCodes: number[]}>>} All releases with their lifecycle state
   * @throws {Error} If authentication fails or the request fails
   */
  async getAndroidReleases(bundleId, track = 'production') {
    if (!bundleId) {
      throw new Error('bundleId is required');
    }

    const accessToken = await this._authenticateGoogle();
    if (!accessToken) {
      throw new Error('Failed to authenticate with Google');
    }

    try {
      const options = { headers: { Authorization: `Bearer ${accessToken}` } };

      const response = await this.androidPublisherApi.get(
        `/${bundleId}/tracks/${track}/releases`,
        options
      );

      const releases = response?.data?.releases || [];

      return releases.map((release) => {
        const splitVersion = release.releaseName?.split(' ') || [];
        const versionName = splitVersion.length > 1 ? splitVersion[1] : splitVersion[0];
        return {
          version: versionName?.replace(/[()]/g, '') || '0.0.0',
          releaseName: release.releaseName,
          lifecycleState: release.releaseLifecycleState,
          versionCodes: (release.activeArtifacts || []).map((artifact) => artifact.versionCode),
        };
      });
    } catch (error) {
      if (error.message.includes('bundleId')) {
        throw error;
      }
      throw new Error(`Failed to fetch Android releases for ${bundleId}: ${error.message}`);
    }
  }

  /**
   * Get production versions for both iOS and Android for a single bundle ID
   * @param {string} bundleId - The bundle identifier/package name
   * @returns {Promise<{ios: {version: string}|null, android: {version: string|null, latest_release: {version: string|null, status: string|null}}|null, errors: Object}>} Version info and any errors
   */
  async getVersions(bundleId) {
    if (!bundleId) {
      throw new Error('bundleId is required');
    }

    const result = {
      ios: null,
      android: null,
      errors: {},
    };

    // Fetch iOS version
    try {
      result.ios = await this.getIosVersion(bundleId);
    } catch (error) {
      result.errors.ios = error.message;
    }

    // Fetch Android version
    try {
      result.android = await this.getAndroidVersion(bundleId);
    } catch (error) {
      result.errors.android = error.message;
    }

    // Clean up errors object if empty
    if (Object.keys(result.errors).length === 0) {
      delete result.errors;
    }

    return result;
  }

  /**
   * Get production versions for multiple bundle IDs
   * @param {string[]} bundleIds - Array of bundle identifiers
   * @returns {Promise<Object>} Object with bundle IDs as keys and version info as values
   */
  async getVersionsForMultipleBundles(bundleIds) {
    if (!Array.isArray(bundleIds) || bundleIds.length === 0) {
      throw new Error('bundleIds must be a non-empty array');
    }

    const results = {};

    for (const bundleId of bundleIds) {
      results[bundleId] = await this.getVersions(bundleId);
    }

    return results;
  }

  /**
   * Get only the iOS version for a bundle ID (convenience method)
   * @param {string} bundleId - The iOS bundle identifier
   * @returns {Promise<{version: string}>} The iOS version object
   */
  async ios(bundleId) {

    return this.getIosVersion(bundleId);
  }

  /**
   * Get only the Android version for a bundle ID (convenience method)
   * @param {string} bundleId - The Android package name
   * @returns {Promise<{version: string, status: string}>} The Android version object
   */
  async android(bundleId) {
    return this.getAndroidVersion(bundleId);
  }
}

// Factory function for quick instantiation
const createClient = (options) => new MobileAppVersions(options);

module.exports = MobileAppVersions;
module.exports.MobileAppVersions = MobileAppVersions;
module.exports.createClient = createClient;
