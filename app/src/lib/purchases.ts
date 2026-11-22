import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

// RevenueCat の公開APIキー（ストアごとに別）。未設定なら課金機能はオフになる
const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

let configured = false;

export const purchasesEnabled = Boolean(apiKey);

export function identifyPurchaser(userId: string) {
  if (!apiKey) return;
  try {
    if (!configured) {
      Purchases.configure({ apiKey, appUserID: userId });
      configured = true;
    } else {
      Purchases.logIn(userId);
    }
  } catch (e) {
    console.warn('RevenueCat の初期化に失敗しました', e);
  }
}

export async function resetPurchaser() {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // 匿名ユーザーのときは logOut が失敗するが問題ない
  }
}

export async function getPremiumPackages(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

/** 購入処理。サーバー側の premium_until は RevenueCat → Webhook で更新される */
export async function buy(pkg: PurchasesPackage) {
  await Purchases.purchasePackage(pkg);
}

export async function restore() {
  if (!configured) return;
  await Purchases.restorePurchases();
}
