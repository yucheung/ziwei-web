# B1-4 排盤 Golden Fixtures 研究 (iztro v2.5.8)

## 1. Fixtures List (排盤測試案例集)

本表列出 10+ 組涵蓋 iztro 排盤邊界情境的測試資料。所有案例皆以 `language: 'zh-TW'` 為預設參數。

**已實測驗證**：全部 13 組已於 iztro v2.5.8 實際執行 `getChart()` 驗證（見
`src/lib/goldenChart.test.ts`），非推測值。第 3、4、5 組的 Expected 欄位已依實測
結果修正，並在「說明」補充修正原因；詳見第 4 節「實測修正記錄」。

| 測試情境 | 輸入參數 (Options) | 預期輸出要點 (Expected) | 分級 (Level) | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| **1. 標準早子時** | `date: '2023-05-15'`<br>`timeIndex: 0`<br>`gender: 'male'` | 命/身宮: 辰/辰<br>命宮主星: 無(空宮)<br>命宮大限: 5-14<br>四化: 兄弟宮破軍化祿<br>農曆: 二〇二三年三月廿六 (癸卯年) | L1（已實測驗證） | 測試早子時 (00:00-01:00) 換日但未換干支的基準行為。由 iztro 內部規則推導。 |
| **2. 晚子時** | `date: '2023-05-15'`<br>`timeIndex: 12`<br>`gender: 'male'` | 命/身宮: 辰/辰<br>命宮主星: 紫微,天相<br>命宮大限: 5-14<br>四化: 遷移宮破軍化祿<br>農曆: 二〇二三年三月廿六 (癸卯年) | L2（已實測驗證） | 測試夜子時 (23:00-24:00) 的年/日干支推算。與市面多數中州派權威軟體行為一致。 |
| **3. 立春日（15:00）** | `date: '2024-02-04'`<br>`timeIndex: '15:00'`<br>`gender: 'male'`<br>`config: { algorithm: 'zhongzhou', yearDivide: 'exact' }` | 命宮: 巳<br>命宮主星: 太陰<br>命宮大限: 3-12<br>農曆: 二〇二三年腊月廿五（**年柱甲辰**，非原稿癸卯） | L1（已實測驗證，已修正） | **原稿誤標**：原稿假設立春 (16:26) 前年干支維持癸卯，並誤用不存在的 `yearDivide: 'liChun'`。實測顯示 iztro 的 `yearDivide: 'exact'` 以「立春當日」為最小分界粒度，不精算到鐘點，故 2024-02-04 全天（含 15:00）年柱已是甲辰。命宮/主星/大限預測本身正確，僅年柱標註有誤，已修正；`yearDivide` 正確可用值僅 `'normal' \| 'exact'`。 |
| **4. 立春日（17:00）** | `date: '2024-02-04'`<br>`timeIndex: '17:00'`<br>`gender: 'male'`<br>`config: { algorithm: 'zhongzhou', yearDivide: 'exact' }` | 命宮: 辰<br>命宮主星: 廉貞(化祿),天府<br>命宮大限: 3-12<br>農曆: 二〇二三年腊月廿五（年柱甲辰） | L1（已實測驗證，已修正） | 與第 3 組同日同年柱（甲辰），差異純粹來自 15:00→17:00 跨越申時/酉時的時辰差，並非跨越立春年界（同日全天已是甲辰，見第 3 組說明）。原稿的 `config` 鍵名 `yearDivide: 'liChun'` 已修正為合法值 `'exact'`。 |
| **5. 農曆除夕** | `date: '2024-02-09'`<br>`timeIndex: 6`<br>`gender: 'male'`<br>`config: { algorithm: 'zhongzhou', yearDivide: 'normal' }` | 命宮: 未<br>命宮主星: 無(空宮)<br>命宮大限: 6-15<br>農曆: 二〇二三年腊月三十 | L1（已實測驗證，已修正） | **原稿誤標**：原稿的「紫微,破軍／大限5-14」實為量測時 iztro 全域 `yearDivide` 狀態被前一次呼叫（`'exact'`）污染所致（iztro 的 `config()` 對未提供的欄位一律 fallback 回目前全域值而非固定預設，同類根因見 `src/lib/fortunes.ts` 內 C4 註解）。2024-02-09 早於農曆正月初一 (2024-02-10)，`yearDivide: 'normal'` 下年柱仍為癸卯，命宮為空宮，大限為 6-15，已修正。 |
| **6. 農曆正月初一** | `date: '2024-02-10'`<br>`timeIndex: 6`<br>`gender: 'male'` | 命宮: 申<br>命宮主星: 太陽(化忌),巨門<br>命宮大限: 4-13<br>農曆: 二〇二四年正月初一 | L1（已實測驗證） | 測試標準農曆跨年第一天，確認生年干支與斗數盤曆法同步。 |
| **7. 農曆閏月** | `date: '2023-04-10'`<br>`timeIndex: 6`<br>`gender: 'male'` | 命宮: 戌<br>命宮主星: 天機,天梁<br>命宮大限: 2-11<br>農曆: 二〇二三年闰二月二十 | L2（已實測驗證） | 測試 2023 閏二月的排盤。經比對權威曆法工具，iztro 正確將其視為閏二月並套用下半月/整月排盤規則。 |
| **8. 真太陽時未變** | `date: '2023-05-15'`<br>`timeIndex: '12:55'`<br>`gender: 'male'`<br>(無經度) | 命宮: 戌<br>命宮主星: 武曲<br>命宮大限: 2-11<br>時辰: 午時 (時干支戊午) | L1（已實測驗證） | 12:55 預設為午時。此為真太陽時校正對照組。 |
| **9. 真太陽時變更** | `date: '2023-05-15'`<br>`timeIndex: '12:55'`<br>`gender: 'male'`<br>`longitude: 121.56` | 命宮: 酉<br>命宮主星: 紫微,貪狼(化忌)<br>命宮大限: 3-12<br>時辰: 未時 (時干支己未) | L1（已實測驗證） | 加上台北經度 (121.56) 後，時間加上約 6 分鐘，跨越 13:00 變為未時。測試經緯度對時辰的絕對影響。 |
| **10. 陽男順行** | `date: '2024-05-15'`<br>`timeIndex: 6`<br>`gender: 'male'` | 命宮: 亥 (大限 6-15)<br>兄弟大限: 116-125<br>父母大限: 16-25 | L1（已實測驗證） | 甲辰年 (陽男)，大限由命宮順行至父母宮 (16-25)。 |
| **11. 陽女逆行** | `date: '2024-05-15'`<br>`timeIndex: 6`<br>`gender: 'female'` | 命宮: 亥 (大限 6-15)<br>兄弟大限: 16-25<br>父母大限: 116-125 | L1（已實測驗證） | 甲辰年 (陽女)，大限由命宮逆行至兄弟宮 (16-25)。 |
| **12. 空宮** | `date: '2024-05-02'`<br>`timeIndex: 6`<br>`gender: 'male'` | 命宮: 戌<br>命宮主星: 無<br>命宮大限: 6-15 | L1（已實測驗證） | 測試命宮無主星的極端狀況，確保 majorStars 陣列長度為 0 且前端顯示能正常處理。 |
| **13. 生年四化** | `date: '2024-05-15'`<br>`timeIndex: 6`<br>`gender: 'male'` | 命宮廉貞化祿<br>財帛破軍化權<br>官祿武曲化科<br>僕役太陽化忌 | L2（已實測驗證） | 測試 2024 (甲年) 廉破武陽四化。比對中州派法則，四化落宮與星曜完全相符。 |

---

## 2. 關鍵欄位路徑 (Deterministic Assertions)

在撰寫 Golden tests (單元或整合測試) 時，以下 `chart` 物件的路徑為「確定性排盤事實」，適合做為斷言 (Assertion) 的依據：

1. **`chart.lunarDate` / `chart.chineseDate`**
   - **理由**：驗證引擎是否正確計算農曆轉換、閏月以及干支，為排盤的時空基準。
2. **`chart.earthlyBranchOfSoulPalace` (命宮地支) & `chart.earthlyBranchOfBodyPalace` (身宮地支)**
   - **理由**：命身宮地支為星盤的核心，錯則全盤錯。
3. **`chart.palaces.find(p => p.name === '命宮').majorStars[].name`**
   - **理由**：用以驗證十四主星排布。只要命宮主星正確，紫微星系與天府星系的位置通常即為正確。
4. **`chart.palaces.find(p => p.name === '命宮').decadal.range`**
   - **理由**：確保水二局、木三局等五行局數，以及男女陰陽順逆行的歲數區間運算正確。
5. **`chart.palaces[].majorStars.find(s => s.mutagen)`**
   - **理由**：星曜的生年四化屬性 (`mutagen`) 綁定於具體星曜，可斷言祿權科忌是否精準對應。

---

## 3. 測試範圍排除 (Out of Scope)

為保持測試純粹與高效，**本文件及後續由此衍生的測試案例，明確排除以下項目**：

- **不做規則 Golden (格局成立)**：不測試「三奇嘉會」、「機月同梁」等格局是否成立，因為格局判定往往因流派或見解而有爭議，非絕對數學事實。
- **不做解讀案例集 (LLM 推論)**：不包含對於命盤的吉凶解釋、流年運勢或性向推論，僅針對排盤引擎計算出的「靜態事實陣列」進行相等性斷言 (Equality Assertion)。

---

## 4. 實測修正記錄 (B1-4)

可執行測試見 `src/lib/goldenChart.test.ts`（13 組，對應本文件全部案例，斷言命/身宮、
命宮主星、命宮大限、生年四化、農曆/年柱）。以下為將本文件從「推測 skeleton」轉為
「iztro v2.5.8 實測 ground truth」過程中發現、且已修正的落差：

1. **第 3 組（原「立春年前」）**：原稿假設立春 (16:26) 前年柱仍為癸卯，且使用不存在
   的 `config.yearDivide: 'liChun'`（合法值僅 `'normal' | 'exact'`）。實測顯示
   `yearDivide: 'exact'` 以「立春當日」為最小分界粒度，不精算到鐘點——2024 立春落在
   2024-02-04，故該日全天（含 15:00）年柱已是甲辰。命宮/主星/大限預測本身正確，僅
   年柱標註有誤，已修正。
2. **第 4 組（原「立春年後」）**：`config` 鍵名同上已修正為 `'exact'`；與第 3 組實為
   同一年柱（甲辰）、不同時辰（申時/酉時）的比較，非跨越立春年界的比較。
3. **第 5 組（農曆除夕）**：原稿「命宮紫微,破軍／大限5-14」有誤，實測正確值為「命宮
   空宮／大限6-15」。根因並非排盤引擎錯誤，而是**量測方法論陷阱**：iztro 的
   `config()`（`node_modules/iztro/lib/astro/astro.js`）對呼叫時未提供的欄位，一律
   fallback 回目前的全域模組狀態，而非固定的函式庫預設值：
   ```js
   var yearDivide = _b === void 0 ? _yearDivide : _b; // _yearDivide 是模組級可變全域變數
   ```
   若量測時先呼叫過 `yearDivide: 'exact'` 的案例（如第 3、4 組），之後省略
   `yearDivide` 的呼叫會**靜默沿用**上一次的 `'exact'`，而非回到函式庫真正預設值
   `'normal'`。這與 `src/lib/fortunes.ts` 內已知的 C4（`language` 全域狀態污染）
   屬同一根因類別，只是這次影響的是 `yearDivide`（原則上 `dayDivide` /
   `ageDivide` / `horoscopeDivide` / `algorithm` / `mutagens` / `brightness`
   等其餘 config 欄位都有相同風險）。
   **對 golden 測試的影響**：`goldenChart.test.ts` 內每個案例一律明確傳入完整
   `config`（含 `yearDivide`），不依賴省略欄位時的隱含預設，以保證測試結果不受
   執行順序影響。
   **對正式產品程式的潛在影響（未修復，僅標記）**：`src/App.tsx` 的 `config` state
   預設為 `{ ...DEFAULT_CONFIG }`（不含 `yearDivide`），若使用者曾經（透過
   `Settings.tsx`）將 `yearDivide` 切到 `'exact'` 後又切回未設定狀態，或應用程式
   在同一次 session 內以不同 `yearDivide` 呼叫過 `getChart()`，後續省略
   `yearDivide` 的呼叫可能沿用錯誤的全域狀態。此為 iztro 函式庫層級的已知行為，
   建議另立票根，仿照 C4 的修法（於呼叫前明確重置 / 每次呼叫皆帶入完整 config）
   一併處理，不屬本次 B1-4 範圍，故僅記錄不逕行修改 `astro.ts` 或 `App.tsx`。
4. **其餘 10 組（1、2、6-13）**：實測結果與原稿 Expected 完全相符（除少數原稿省略
   標註的四化字尾，如第 6、9 組已於本文件補標 `(化忌)`），無需修正。
