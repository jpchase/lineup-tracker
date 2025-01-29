{ pkgs }: {
  channel = "stable-23.11";
  packages = [
    pkgs.nodejs_20
    pkgs.jdk19
    # Chromium (Puppeteer) shared library dependencies
    pkgs.alsa-lib
    pkgs.atk
    pkgs.cairo
    pkgs.cups
    pkgs.dbus
    pkgs.expat
    pkgs.glib
    pkgs.gnupg
    pkgs.libdrm
    pkgs.libxkbcommon
    pkgs.lightgbm
    pkgs.mesa
    pkgs.nspr
    pkgs.nss
    pkgs.pango
    pkgs.xorg.libX11
    pkgs.xorg.libxcb
    pkgs.xorg.libXcomposite
    pkgs.xorg.libXdamage
    pkgs.xorg.libXext
    pkgs.xorg.libXfixes
    pkgs.xorg.libXrandr
  ];
  idx.extensions = [
    "bbenoist.Nix"
  ];
  idx.previews = {
    enable = false;
    previews = [
      {
        command = [
          "npm"
          "start"
          "dev"
          "--"
          "--port"
          "$PORT"
          "--host"
          "0.0.0.0"
        ];
        id = "web";
        manager = "web";
      }
    ];
  };
}
