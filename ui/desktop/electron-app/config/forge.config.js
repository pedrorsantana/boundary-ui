const process = require('process');
const { version } = require('../src/boundary-cli.js');

const formattedCLIVersion = version().formatted;

const appVersion = process.env.VERSION
  ? `Version:  ${process.env.VERSION}\n`
  : '';
const appCommit = process.env.COMMIT
  ? `Commit:  ${process.env.COMMIT}\n`
  : '';

const formattedAppVersion = `${appVersion}${appCommit}`;

module.exports = {
  hooks: {
    prePackage: () => {
      if (!process.env.BOUNDARY_DESKTOP_SIGNING_IDENTITY) {
        console.warn('\nWARNING: Could not find signing identity.');
      }
    }
  },
  packagerConfig: {
    ignore: [
      "/ember-test(/|$)",
      "/tests(/|$)"
    ],
    name: "Boundary Desktop",
    appBundleId: "com.electron.boundary",
    // TODO: where should the client version number come from?
    appVersion: `${formattedAppVersion}${formattedCLIVersion}\n`,
    appCopyright: "Copyright © 2021 HashiCorp, Inc.",
    icon: "./config/macos/icon.icns",
    osxSign: {
      identity: process.env.BOUNDARY_DESKTOP_SIGNING_IDENTITY,
      "hardened-runtime": true,
      entitlements: "./config/macos/entitlements.plist",
      "entitlements-inherit": "./config/macos/entitlements.plist",
      "signature-flags": "library"
    }
  },
  makers: [
    {
      name: "@electron-forge/maker-dmg",
      config: {
        title: "Boundary",
        name: "boundary-desktop",
        icon: "./config/macos/disk.icns",
        background: "./config/macos/background.png"
      }
    }
  ]
}
