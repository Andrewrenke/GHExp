# Performance measurements — raw output

Build: **release** APK (`assembleRelease`, Hermes, minified), installed on a
Pixel 7 API 36 emulator (60 Hz, `-gpu host`, 3 GB RAM, 4 cores), macOS host.

Reproduce with the commands shown under each section.

---

## 1. Cold start — `adb shell am start -W`

First series, immediately after install (ART has not finished optimising the
app's dex yet — kept here because dropping it would flatter the result):

```
TotalTime: 3602   WaitTime: 3781
TotalTime: 2667   WaitTime: 2761
TotalTime: 11368  WaitTime: 11383
TotalTime: 2093   WaitTime: 2184
TotalTime: 4164   WaitTime: 4176
```

After forcing AOT compilation (`adb shell cmd package compile -m speed -f <pkg>`),
which is what a Play Store install effectively gets via cloud profiles:

```
TotalTime: 3556   <- transition run, still recompiling
TotalTime: 893
TotalTime: 982
TotalTime: 1028
TotalTime: 952
TotalTime: 741
```

**Steady state: median 952 ms, range 741–1028 ms.**

```bash
adb shell cmd package compile -m speed -f com.anonymous.GitHubExplorer
adb shell am force-stop com.anonymous.GitHubExplorer
adb shell am start -W -n com.anonymous.GitHubExplorer/.MainActivity
```

---

## 2. Memory — `adb shell dumpsys meminfo`

Measured on the search screen with **100 repository cards loaded** (`per_page=100`)
and their avatars decoded:

```
TOTAL PSS:   144740 KB  (~141 MB)
TOTAL RSS:   290720 KB  (~284 MB)
Native Heap:  29260 KB
Dalvik Heap:   9556 KB
TOTAL SWAP:       0 KB
```

```bash
adb shell dumpsys meminfo com.anonymous.GitHubExplorer
```

---

## 3. Frame timing — `adb shell dumpsys gfxinfo`

~20 s of continuous flinging through 100 loaded cards, two independent runs:

| Run | Frames | Janky        | 50th  | 90th  | 95th  | 99th   |
| --- | ------ | ------------ | ----- | ----- | ----- | ------ |
| 1   | 423    | 78 (18.4 %)  | 27 ms | 42 ms | 65 ms | 109 ms |
| 2   | 415    | 100 (24.1 %) | 30 ms | 53 ms | 65 ms | 150 ms |

Run 1 detail: `Missed Vsync: 9`, `Slow UI thread: 22`, `Slow bitmap uploads: 1`.

```bash
adb shell dumpsys gfxinfo com.anonymous.GitHubExplorer reset
# fling the list for ~20 s
adb shell dumpsys gfxinfo com.anonymous.GitHubExplorer
```

### The first attempt was invalid — kept here because the delta is the point

An earlier attempt on the **same APK** reported 65 % jank and a 4950 ms 99th
percentile. That number was garbage: it rendered **72 frames in ~20 s** (~3.6
FPS), a repeat run returned `Total frames rendered: 0`, and `system_server` and
`SystemUI` both ANR'd before the app was even involved.

Cause, from `adb shell top` at the time:

```
Mem: 3046940K total, 2910884K used, 136056K free   <- 136 MB free
Swap: 2285200K total, 357104K used
400%cpu 6%user 16%sys 366%idle                     <- CPU 92% idle
```

The VM was out of RAM and swapping while the CPU idled. Re-running the emulator
with `-memory 4096` (2.29 GB available instead of 136 MB) changed **nothing in
the app** and took the frame count from 72 to 423.

**Lesson for anyone repeating this:** always sanity-check `Total frames
rendered` before trusting a jank percentage. A low frame count means the
measurement stalled, not that the UI is slow.

### How to read the valid numbers

At 60 Hz the budget is 16.7 ms. The median frame here is **27–30 ms**, so this
build does **not** hold 60 FPS while flinging on this emulator — call it
~35 FPS equivalent, with ~20 % of frames late.

How much of that is the app versus a virtualised GPU on a MacBook Air is still
open: `90th gpu percentile` was 4950 ms (a stall bucket) even in the good runs,
which no real device produces. `Slow UI thread: 22` out of 423 frames is the
part most plausibly attributable to the app.

**A physical device is still required for a defensible FPS claim.**

---

## 4. iOS — physical device (iPhone 15 Pro, iOS 18.7.8)

Release build, installed over USB, measured with Instruments:

```bash
xcrun xctrace record --device <udid> --template "App Launch" \
  --launch com.anonymous.GitHubExplorer --output launch.trace --time-limit 25s
xcrun xctrace export --input launch.trace \
  --xpath '/trace-toc/run[@number="1"]/data/table[@schema="life-cycle-period"]'
```

Launch phases to first frame:

| Phase                              | Duration |
| ---------------------------------- | -------- |
| Static Runtime Initialization      | 13.1 ms  |
| UIKit Initialization               | 14.2 ms  |
| UIKit Scene Creation               | 0.4 ms   |
| `willFinishLaunchingWithOptions()` | 0.0 ms   |
| `didFinishLaunchingWithOptions()`  | 11.8 ms  |
| Initial Frame Rendering            | 0.5 ms   |

**~40 ms of app-controlled launch work to the first frame.** Note this is the
native launch path; Hermes then evaluates the JS bundle, so it is not
comparable to Android's `am start -W TotalTime` (952 ms), which waits for the
first _content_ frame. Two different metrics — do not put them in the same
column.

### Scroll hitches — 30 s of continuous flinging, 100 loaded cards

```bash
xcrun xctrace record --device <udid> --template "Animation Hitches" \
  --attach GitHubExplorer --output hitches.trace --time-limit 30s
```

| Metric               | Value                           |
| -------------------- | ------------------------------- |
| Hitches              | 12 in 30 s                      |
| Total hitch time     | 108 ms → **3.6 ms/s**           |
| Median hitch         | 4.2 ms                          |
| Worst hitch          | 37.5 ms                         |
| Severity             | 8 Low, 3 Moderate, 1 High       |
| Average frame rate   | **77 FPS** (median 79, peak 96) |
| Seconds below 55 FPS | 2 of 31                         |

**3.6 ms/s is inside Apple's 5 ms/s guidance**, with room to spare. Touch input
had to be driven by hand — iOS has no CLI equivalent of `adb shell input swipe`.

On the frame rate: 77 FPS average against a 120 Hz panel is not a symptom.
ProMotion drops the refresh rate when content does not demand more, and the list
is stationary between flings. The meaningful number is that only 2 seconds out
of 31 fell below 55 FPS.

### This is why the emulator numbers were not published as app metrics

Same commit, same JS bundle, two environments:

|              | Android emulator               | iPhone 15 Pro                       |
| ------------ | ------------------------------ | ----------------------------------- |
| Frame timing | 27–30 ms median, 18–24 % janky | 3.6 ms/s hitch ratio, 79 FPS median |

The emulator was measuring a virtualised GPU on a MacBook Air. Even
`Slow UI thread: 22` — the share this document previously called "most
plausibly ours" — did not reproduce on real hardware. Treat emulator frame
timing as a smoke test only.

---

## 5. Known issue: the iOS device build ships without `React.framework`

`npx expo run:ios --device --configuration Release` **builds and installs
successfully, then crashes on launch**:

```
dyld[789]: Library not loaded: @rpath/React.framework/React
  Reason: tried: '.../GitHubExplorer.app/Frameworks/React.framework/React' (no such file)
```

Cause: RN 0.86 ships React core as a prebuilt XCFramework
(`Pods/React-Core-prebuilt/React.xcframework`). The `[CP] Copy XCFrameworks`
phase does extract the `ios-arm64` slice into
`Build/Products/Release-iphoneos/XCFrameworkIntermediates/React-Core-prebuilt/React.framework`
— but CocoaPods' embed script,
`Pods/Target Support Files/Pods-GitHubExplorer/Pods-GitHubExplorer-frameworks.sh`,
never installs it into the app bundle. It lists `ReactNativeDependencies`,
`hermesvm` and every Expo framework; `React.framework` appears in **neither the
Debug nor the Release block**.

Workaround used to verify the app on device (not durable — `pod install`
regenerates the script):

```bash
APP=".../Release-iphoneos/GitHubExplorer.app"
codesign -d --entitlements :- "$APP" > ent.plist
cp -R ".../XCFrameworkIntermediates/React-Core-prebuilt/React.framework" "$APP/Frameworks/"
codesign --force --sign "Apple Development: <you>" --timestamp=none "$APP/Frameworks/React.framework"
codesign --force --sign "Apple Development: <you>" --entitlements ent.plist --timestamp=none "$APP"
xcrun devicectl device install app --device <udid> "$APP"
```

The durable fix is to stop using the prebuilt core and compile React Native from
source, via `expo-build-properties`:

```json
["expo-build-properties", {"ios": {"buildReactNativeFromSource": true}}]
```

That survives `expo prebuild` because it lives in `app.json`. It costs a much
longer first build. **Not applied yet** — it needs its own verification pass.
