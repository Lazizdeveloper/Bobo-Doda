# NixOS / nix uchun dev muhiti.
#
#   nix-shell        # yoki: nix develop -f shell.nix
#   npm install
#   npm run start:dev
#
# NEGA: Prisma o'zining query/schema engine binary'larini yuklab oladi, lekin
# `linux-nixos` uchun precompiled binary YO'Q (`binaries.prisma.sh` 404). Bu
# shell nixpkgs'dan `prisma-engines` beradi va Prisma'ga PATH'ni env orqali
# ko'rsatadi. Boshqa distributsiyalarda (Ubuntu, Alpine/Docker, CI) bu kerak
# emas — u yerda `npm install` postinstall'i o'zi ishlaydi.

{ pkgs ? import <nixpkgs> { } }:

let
  # Prisma npm paketi versiyasiga MOS kelishi shart (package.json: prisma ^6.x).
  prismaEngines = pkgs.prisma-engines_6;
in
pkgs.mkShell {
  packages = [
    pkgs.nodejs_22
    pkgs.openssl
    prismaEngines
    pkgs.postgresql_16 # lokal `prisma migrate` uchun throwaway klaster
  ];

  shellHook = ''
    export PRISMA_QUERY_ENGINE_LIBRARY="${prismaEngines}/lib/libquery_engine.node"
    export PRISMA_QUERY_ENGINE_BINARY="${prismaEngines}/bin/query-engine"
    export PRISMA_SCHEMA_ENGINE_BINARY="${prismaEngines}/bin/schema-engine"
    export PRISMA_FMT_BINARY="${prismaEngines}/bin/prisma-fmt"
    export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
    echo "Bobo&Doda backend nix-shell — Prisma engine: ${prismaEngines}"
  '';
}
