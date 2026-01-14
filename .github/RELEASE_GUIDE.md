# GitHub Actions Release Setup

This repository has automated release workflows that build, sign, and publish updates automatically.

## 🔐 Required Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### 1. TAURI_PRIVATE_KEY
Your private signing key generated with:
```bash
tauri signer generate -w ~/.tauri/taskly.key
```

Copy the entire contents of `~/.tauri/taskly.key` (or `C:\Users\<username>\.tauri\taskly.key` on Windows)

### 2. TAURI_KEY_PASSWORD (Optional)
If you set a password when generating the key, add it here. Otherwise, leave empty or omit.

## 🚀 How to Release

### Option 1: Tag-based Release (Recommended)

1. Update version in `src-tauri/tauri.conf.json`:
   ```json
   "version": "0.1.0"
   ```

2. Commit and push:
   ```bash
   git add .
   git commit -m "Release v0.1.0"
   git push
   ```

3. Create and push a tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

The workflow automatically:
- ✅ Builds for Windows and macOS
- ✅ Signs all installers
- ✅ Creates `latest.json` manifest
- ✅ Publishes GitHub release
- ✅ Your app will detect the update!

### Option 2: Manual Dispatch

1. Go to Actions → Release → Run workflow
2. Enter the version (e.g., `0.1.0`)
3. Click "Run workflow"

## 📝 Release Notes

The workflow creates a draft release. You can:
1. Edit the release description on GitHub
2. Add detailed release notes
3. The notes will appear in your UpdaterModal automatically

## 🔍 What Gets Built

### Windows
- `Taskly_<version>_x64_en-US.msi` - Installer
- `Taskly_<version>_x64_en-US.msi.sig` - Signature

### macOS
- `Taskly_<version>_x64.app.tar.gz` - Intel Mac
- `Taskly_<version>_x64.app.tar.gz.sig` - Signature
- `Taskly_<version>_aarch64.app.tar.gz` - Apple Silicon
- `Taskly_<version>_aarch64.app.tar.gz.sig` - Signature

### Update Manifest
- `latest.json` - Auto-generated with all signatures and URLs

## 🛠️ First-Time Setup Checklist

- [ ] Add `TAURI_PRIVATE_KEY` to GitHub Secrets
- [ ] Add `TAURI_KEY_PASSWORD` to GitHub Secrets (if you set a password)
- [ ] Update repository URL in `tauri.conf.json` updater endpoints
- [ ] Make sure public key is in `tauri.conf.json`
- [ ] Test with a v0.0.2 release to verify everything works

## 🎯 Workflow Stages

```
┌─────────────────┐
│ Create Release  │  Creates draft GitHub release
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build Windows  │  Builds & signs .msi
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build macOS    │  Builds & signs .app.tar.gz
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate JSON   │  Creates latest.json from signatures
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Publish Release │  Makes release public
└─────────────────┘
```

## ⚠️ Important Notes

- The workflow builds for both Windows and macOS in parallel
- All builds are automatically signed with your private key
- The release starts as a draft - you can add release notes before publishing
- Users will see the update within seconds of publication
- First release should be v0.0.1 or higher (current version in config)

## 🐛 Troubleshooting

**Workflow fails with "TAURI_PRIVATE_KEY not found"**
- Make sure you added the secret in repository settings
- Verify the secret name is exactly `TAURI_PRIVATE_KEY`

**Update not showing in app**
- Verify `latest.json` was created and uploaded
- Check the endpoint URL in `tauri.conf.json` matches your repo
- Make sure the version in `latest.json` is higher than your current version

**Signature verification fails**
- Ensure the public key in `tauri.conf.json` matches your private key
- Don't edit or re-format the public key string
