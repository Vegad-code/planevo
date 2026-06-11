# RevenueCat Setup for Planevo Mobile

## Installed SDK packages

Install or repair the Expo-compatible RevenueCat packages from the mobile app directory:

```bash
cd apps/mobile
npx expo install react-native-purchases react-native-purchases-ui
```

The current Planevo install uses:

- `react-native-purchases@10.2.2`
- `react-native-purchases-ui@10.2.2`

## Expo environment

The SDK is configured through:

```bash
EXPO_PUBLIC_REVENUECAT_API_KEY=your-revenuecat-public-sdk-key
```

This is a public client key, so it is safe to expose in the app bundle. For production, use your RevenueCat production platform API keys and keep iOS, Android, and Web Billing apps aligned with the matching bundle identifiers.

## RevenueCat dashboard setup

Create these products in the relevant stores first, then import or map them in RevenueCat:

- Planevo Pro monthly product: `planevo_pro_monthly`
- Yearly product: `yearly`
- Monthly product: `monthly`

Create an entitlement:

- Entitlement identifier: `Planevo Pro`

Attach the products/packages that should unlock Pro to the `Planevo Pro` entitlement.

Create an offering:

- Mark the offering as `Current`.
- Add monthly and yearly packages.
- Configure the RevenueCat Paywall for that current offering.

Configure Customer Center in the RevenueCat dashboard when you want subscribers to manage cancellations, restores, refunds, and support flows from the app.

## App integration points

RevenueCat is centralized in `lib/revenuecat.ts`.

```ts
import {
  getCustomerInfo,
  isPro,
  presentCustomerCenter,
  presentPlanevoProPaywallIfNeeded,
} from '@/lib/revenuecat';

const customerInfo = await getCustomerInfo();
const hasPro = isPro(customerInfo);

if (!hasPro) {
  await presentPlanevoProPaywallIfNeeded();
}

await presentCustomerCenter();
```

The root layout initializes the SDK and logs the Supabase user into RevenueCat with the Supabase user ID. The Settings screen listens for customer-info updates and shows RevenueCat Customer Center and Planevo Pro paywall actions.

## Testing notes

RevenueCat purchases require a native development build for real store purchase flows:

```bash
cd apps/mobile
npx expo start --dev-client
```

Expo Go can preview integration logic through RevenueCat preview behavior, but real in-app purchases must be tested in a development build, simulator StoreKit flow, TestFlight, or an Android build connected to Google Play test tracks.
