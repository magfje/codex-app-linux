#!/bin/sh
set -eu

repo_config=/etc/pacman.conf.d/codex-personal.conf
include_line="Include = ${repo_config}"

sudo install -d -m 755 /etc/pacman.conf.d
printf '%s\n' \
  '[codex-personal]' \
  'SigLevel = Optional TrustAll' \
  'Server = https://github.com/magfje/codex-app-linux/releases/download/pacman-repo' |
  sudo tee "${repo_config}" >/dev/null

if ! grep -Fqx "${include_line}" /etc/pacman.conf; then
  printf '\n%s\n' "${include_line}" | sudo tee -a /etc/pacman.conf >/dev/null
fi

sudo pacman -Syu --needed codex-app-unofficial
