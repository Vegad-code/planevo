# Planevo Mobile Development

Planevo uses a custom Expo development build because the app includes native
code for the iOS widget. Expo Go is useful as a limited fallback, but it cannot
exercise the widget integration.

## First-time device setup

Build and install Planevo on the physical device:

```powershell
npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile development --platform android
```

The iOS build requires registered test devices and an Apple Developer account.
The Android build produces an installable internal-distribution build.

## Daily development

Start Metro for the installed Planevo development build:

```powershell
npm run start
```

If the phone cannot reach the computer over local Wi-Fi:

```powershell
npm run start:tunnel
```

## Expo Go fallback

Expo Go does not include Planevo's widget native module. The app skips that
integration when running in Expo Go:

```powershell
npm run start:go
```

Planevo currently uses Expo SDK 54. Expo no longer provides the SDK 54 Expo Go
app for physical iPhones, so use the Planevo development build on iPhone.
SDK 54 Expo Go remains available for Android devices and simulators.

If LAN access is blocked by guest Wi-Fi, a VPN, Windows Firewall, or router
client isolation, explicitly opt into a public tunnel:

```powershell
npm run start:go:tunnel
```

Tunnel mode exposes the private development manifest and JavaScript bundle
through Expo's tunnel infrastructure while the command is running.

## Optional native services

- Add `google-services.json` to this directory to enable Android FCM config.
- Set `EXPO_APPLE_TEAM_ID` to enable the iOS widget target and App Group.
- Store the `EXPO_PUBLIC_*` values in EAS environments before cloud builds.
