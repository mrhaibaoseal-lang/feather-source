# 給 Claude 的固定說明（所有 iOS 專案共用）

> 這個 repo 是 public。這裡只寫偏好和憑證「支援什麼功能」，不要放 `.p12`、密碼、裝置 UDID 或任何私密資料。
> 各 iOS 專案的 `CLAUDE.md` 應該指向這份檔案：
> https://github.com/mrhaibaoseal-lang/feather-source/blob/main/CLAUDE.md

## 使用者偏好
- 一律用**繁體中文**回覆。技術說明要精準，以同儕程度溝通。
- iOS App 一律做**原生 App**（SwiftUI），不要網頁版或 PWA。

## 編譯與安裝（不要建議其他方式）
- 電腦是 **Windows**，沒有 Mac，本機無法編譯 iOS。
- iOS 一律用 **GitHub Actions macOS runner** 打包**未簽名 IPA**。不用 EAS Build，也不上 App Store / TestFlight。不要建議 Sideloadly、AltStore 或付費開發者帳號。
- 使用者在手機上用 **Feather** 簽名安裝，憑證是 **FlareStore** 的。
- 發佈：workflow 頂層加 `permissions: contents: write`，最後一步呼叫本 repo 的 action：
  ```yaml
        - name: Publish to private Feather source
          uses: mrhaibaoseal-lang/feather-source@main
          with:
            ipa: 你的.ipa
            icon: 路徑/icon.png   # 可省略
  ```
  專案 repo 必須是 public（Worker 只掃 public repo，macOS Actions 分鐘數也只有 public 免費）。
- Feather 靠版本號判斷「有更新」：建議 build 號用 `${{ github.run_number }}`（例如 xcodebuild 參數 `CURRENT_PROJECT_VERSION=${{ github.run_number }}`）。

## FlareStore 憑證能力（2026-10-31 建立的 Ad Hoc 描述檔，到期日 2027-10-30）
來源：使用者提供的 `.mobileprovision` 裡的 Entitlements。換憑證後要重新確認。

**描述檔類型**：Ad Hoc，App ID 是單一固定 ID（不是萬用字元 `*`），只登記了使用者自己的一台 iPhone。

**App Groups（App 與小工具 / 擴充功能共用資料）**：支援，但**只有這 5 個固定 ID**，不能自訂：
- `group.81c139ae9a27a7f8.1` ～ `group.81c139ae9a27a7f8.5`

做法：entitlements 寫 `group.81c139ae9a27a7f8.1`，程式在執行時用
`FileManager.default.containerURL(forSecurityApplicationGroupIdentifier:)` 逐一測試這 5 個，取第一個可用的。
不同 App 可能共用同一個 group，所以存資料時 key 要加 App 專屬前綴，避免互相覆蓋。

**支援**：
- 推播通知（`aps-environment` = production）、限時通知（time-sensitive）、通訊通知
- Keychain 共用（`NA8294U793.*`）
- iCloud 鍵值儲存（`ubiquity-kvstore-identifier`）、iCloud 文件容器（`ubiquity-container-identifiers`，萬用）
- HealthKit（含背景傳送、健康紀錄）、HomeKit、Siri、Game Center、Sign in with Apple、WeatherKit
- NFC 讀取（NDEF / TAG / PACE）、Wallet 票券（`pass-type-identifiers`）
- Network Extension（VPN、內容過濾、DNS proxy 等）、Hotspot 設定、Wi-Fi 資訊、Wi-Fi Aware、Multipath
- Associated Domains（`*`）、自動填入密碼提供者、使用者字型
- 增加記憶體上限、擴充虛擬定址、多工相機存取、App Attest、ClassKit

**不支援 / 沒有**：
- **CloudKit**：描述檔沒有 `com.apple.developer.icloud-services`，不能用 CloudKit / SwiftData 的 iCloud 同步。
- Apple Pay（`in-app-payments` 是空陣列）。
- 除錯（`get-task-allow` = false）。
