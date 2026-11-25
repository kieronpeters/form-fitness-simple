# Form Fitness — Android wrapper

A deliberately small native shell around the built Form Fitness web app. It exists so the app can be installed over ADB as an APK (a PWA cannot be installed with `adb install`).

## What it does

- Bundles the production `dist/` inside the APK under `assets/www`.
- Serves the bundle from `http://127.0.0.1:8765` using a tiny loopback HTTP server, giving the WebView a stable origin for localStorage, IndexedDB and the service worker.
- Runs fullscreen with the app's dark system bars.
- Opens external links in the phone's browser.
- Supports the app's programme and activity image pickers.
- Keeps the package id `com.kieronpeters.form` so reinstall upgrades preserve app data.

## Build and install

Requirements:

- JDK (Java 17+ works)
- Android SDK with `platforms/android-35` (or another installed platform) and `build-tools`
- `adb` on PATH for installation

From the repository root:

```powershell
.\android\build.ps1            # build android/build/form-fitness.apk
.\android\build.ps1 -Install   # build, install over adb, and launch
```

The script:

1. builds the web app,
2. copies `dist/` into the APK assets,
3. compiles resources and Java with `aapt2`/`javac`,
4. dexes with `d8`, packages assets with forward-slash ZIP paths,
5. aligns and signs with a local debug keystore,
6. optionally installs and launches on the connected device.

Build outputs, the generated asset copy and the local signing key are ignored by git.

## Notes

- This is a local/sideloadable wrapper, not a Play Store artifact.
- The web app also remains installable as a PWA on a stable HTTPS origin.
- The package id is intentionally unchanged from the initial wrapper; the visible app name is **Form Fitness**.
