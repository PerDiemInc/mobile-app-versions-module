# @perdieminc/mobile-app-versions

Fetch production app versions from Google Play Store and Apple App Store.

## Installation

```bash
npm install @perdieminc/mobile-app-versions
```

## Quick Start

```javascript
const MobileAppVersions = require('@perdieminc/mobile-app-versions');

const client = new MobileAppVersions({
  gcpKey: process.env.GCP_KEY // Required for Android lookups
});

// Get iOS version
const iosVersion = await client.getIosVersion('com.example.app');
console.log(iosVersion); // { version: "1.2.3" }

// Get Android version
const androidVersion = await client.getAndroidVersion('com.example.app');
console.log(androidVersion); // { version: "1.2.3", status: "completed" }

// Get both versions
const versions = await client.getVersions('com.example.app');
console.log(versions);
// { ios: { version: "1.2.3" }, android: { version: "1.2.3", status: "completed" } }
```

## API Reference

### Constructor

```javascript
const client = new MobileAppVersions(options);
```

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `gcpKey` | `string` | Base64-encoded GCP service account JSON key | `process.env.GCP_KEY` |
| `googleAuthUrl` | `string` | Google OAuth token URL | `https://oauth2.googleapis.com/token` |
| `itunesUrl` | `string` | iTunes lookup API URL | `https://itunes.apple.com/lookup` |
| `androidPublisherUrl` | `string` | Android Publisher API URL | `https://androidpublisher.googleapis.com/androidpublisher/v3/applications` |

### Methods

#### `getIosVersion(bundleId)`

Fetches the production version of an iOS app from the App Store.

```javascript
const result = await client.getIosVersion('com.example.app');
// Returns: { version: "1.2.3" }
```

#### `getAndroidVersion(bundleId)`

Fetches the production version of an Android app from Google Play.

```javascript
const result = await client.getAndroidVersion('com.example.app');
// Returns: { version: "1.2.3", status: "completed" }
```

#### `getVersions(bundleId)`

Fetches both iOS and Android versions for a single bundle ID.

```javascript
const result = await client.getVersions('com.example.app');
// Returns: { ios: { version: "1.2.3" }, android: { version: "1.2.3", status: "completed" } }
// If one fails: { ios: { version: "1.2.3" }, android: null, errors: { android: "error message" } }
```

#### `getVersionsForMultipleBundles(bundleIds)`

Fetches versions for multiple bundle IDs.

```javascript
const results = await client.getVersionsForMultipleBundles([
  'com.app.one',
  'com.app.two'
]);
// Returns:
// {
//   "com.app.one": { ios: { version: "1.0.0" }, android: { version: "1.0.0", status: "completed" } },
//   "com.app.two": { ios: { version: "2.0.0" }, android: { version: "2.0.0", status: "completed" } }
// }
```

#### Convenience Methods

```javascript
// Shorthand for getIosVersion - returns { version }
await client.ios('com.example.app');

// Shorthand for getAndroidVersion - returns { version, status }
await client.android('com.example.app');
```

### Factory Function

```javascript
const { createClient } = require('@perdieminc/mobile-app-versions');

const client = createClient({ gcpKey: '...' });
```

## Configuration

### Environment Variables

You can configure the module using environment variables instead of constructor options:

| Variable | Description |
|----------|-------------|
| `GCP_KEY` | Base64-encoded GCP service account JSON key |
| `GOOGLE_AUTH_URL` | Google OAuth token URL |
| `ITUNES_URL` | iTunes lookup API URL |
| `ANDROID_PUBLISHER_URL` | Android Publisher API URL |

### GCP Service Account Setup (for Android)

To fetch Android app versions, you need a Google Cloud Platform service account with access to the Google Play Developer API:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the **Google Play Android Developer API**
4. Create a service account with appropriate permissions
5. Download the JSON key file
6. Base64 encode the JSON key:
   ```bash
   base64 -i service-account.json
   ```
7. Set the encoded string as `GCP_KEY`

The service account must also be linked to your Google Play Console:
1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Settings > API access**
3. Link your Google Cloud project
4. Grant the service account access to your apps

## Error Handling

The module throws descriptive errors for common issues:

```javascript
try {
  const result = await client.getIosVersion('invalid.bundle.id');
} catch (error) {
  console.error(error.message);
  // "No iOS app found for bundleId: invalid.bundle.id"
}
```

When using `getVersions()`, errors are captured in the response instead of throwing:

```javascript
const result = await client.getVersions('com.example.app');
if (result.errors?.ios) {
  console.error('iOS lookup failed:', result.errors.ios);
}
if (result.errors?.android) {
  console.error('Android lookup failed:', result.errors.android);
}
```

## Testing

```bash
# Run unit tests
npm test

# Run integration tests (requires network access)
npm run test:integration
```

## Requirements
Built for Node 22.x but can work on node 18.x

## Deployment 
When pushing a git tag it will trigger a Github action that will deploy the package to NPM

## License

ISC

