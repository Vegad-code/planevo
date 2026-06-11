const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const appleTeamId = process.env.EXPO_APPLE_TEAM_ID;
  const googleServicesFile = path.join(__dirname, 'google-services.json');
  const plugins = [...(config.plugins ?? [])];

  if (appleTeamId) {
    plugins.push(['@bacons/apple-targets', {}]);
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      ...(appleTeamId
        ? {
            appleTeamId,
            entitlements: {
              'com.apple.security.application-groups': [
                'group.com.planevo.mobile',
              ],
            },
          }
        : {}),
    },
    android: {
      ...config.android,
      ...(fs.existsSync(googleServicesFile)
        ? { googleServicesFile: './google-services.json' }
        : {}),
    },
    plugins,
  };
};
