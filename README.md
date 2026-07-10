# codex-app-linux

Personal Linux packaging for the Codex desktop app, including machine-specific fixes.

> ‼️ We welcome platform specific PRs/issues/reproductions! Maintainer uses nix/arch (btw).

<img width="2274" height="1387" alt="image" src="https://github.com/user-attachments/assets/8efa863f-3711-4bf1-b36a-8dd165bb04d7" />

`codex-app-linux` is a thin launcher:

- bundles the matching `codex` CLI runtime
- downloads the matching Linux desktop binary archive on first run
- launches the desktop app with `CODEX_CLI_PATH` wired up

## Quick Start

### Arch Linux / pacman

Add the personal repository and install Codex once:

```bash
./scripts/setup-personal-pacman-repo.sh
```

After that, Codex updates with the rest of the system:

```bash
sudo pacman -Syu
```

The repository is unsigned and scoped to this personal fork. Its package artifacts are
served over HTTPS from the fixed `pacman-repo` GitHub Release.

## Requirements

- Linux x64
- GitHub access not required for normal app launch

If `CODEX_CLI_PATH` is already set, the launcher uses it.
Otherwise it uses the bundled `resources/codex`, then falls back to `which codex`.

## What This Repo Does

This fork builds and publishes a personal Linux release pipeline for Codex desktop:

- tracks upstream `prod` and `beta` appcast feeds
- rebuilds the upstream app for Linux x64
- emits `linux-unpacked` and `AppImage`
- publishes stable `codex-app-unofficial` packages to the `codex-personal` pacman repository
- publishes beta builds as GitHub Release assets

## Repo Commands

```bash
npm test
npm run release:prod
npm run release:beta
```
## Distribution Model

GitHub Releases:

- source of truth for Linux desktop artifacts
- uploads `AppImage`
- uploads a tarball of `linux-unpacked`

Personal pacman repository:

- publishes binary packages from the same GitHub release tarballs
- installs the unpacked app into `/opt`
- installs desktop entry + icon for Arch launchers/menus
- prod package: `codex-app-unofficial`
- is consumed directly by pacman, without AUR ownership or an AUR helper

Launcher behavior:

- uses existing `CODEX_CLI_PATH` if set
- otherwise sets `CODEX_CLI_PATH` from bundled `resources/codex`
- finally falls back to `which codex`
- errors if neither is available
- extracts `linux-unpacked` into cache on first run
- AppImage and `linux-unpacked` release binaries perform the same bundled-first lookup at launch

## GitHub Actions

Workflow: `.github/workflows/release.yml`

- scheduled 7 times daily
- checks both upstream channels
- builds `linux-unpacked` and `AppImage`
- creates/releases tagged GitHub assets
- publishes versioned GitHub Releases for prod and beta
- refreshes the fixed `pacman-repo` release for stable packages
- does not publish to npm or the AUR

## Nix

This repo also includes a `flake.nix` with:

- `devShells.default` for local release work
- `apps.release-prod` for `nix run .#release-prod`
- `apps.release-beta` for `nix run .#release-beta`
