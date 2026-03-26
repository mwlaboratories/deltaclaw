{
  description = "Deltaclaw - Discord G2 Glasses App";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        runtimeLibs = with pkgs; [
          glib nss nspr atk cups dbus libdrm gtk3 gdk-pixbuf pango cairo
          libGL libxkbcommon expat alsa-lib at-spi2-atk at-spi2-core udev
          xorg.libX11 xorg.libXcomposite xorg.libXdamage xorg.libXext
          xorg.libXfixes xorg.libXrandr xorg.libxcb xorg.libxshmfence
          webkitgtk_4_1 libsoup_3
          gst_all_1.gstreamer gst_all_1.gst-plugins-base
          gst_all_1.gst-plugins-good gst_all_1.gst-plugins-bad
          gst_all_1.gst-libav
        ];

        fhs = pkgs.buildFHSEnv {
          name = "deltaclaw";
          targetPkgs = _: [ pkgs.nodejs_22 pkgs.git pkgs.curl pkgs.just ] ++ runtimeLibs;
          runScript = "bash";
          profile = ''
            export PS1="[\[\033[1;36m\]deltaclaw@\h\[\033[0m\]:\[\033[1;32m\]\w\[\033[0m\]]$ "
            cd "$DELTACLAW_CWD"
          '';
        };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [ fhs ];
          shellHook = ''
            echo ""
            echo -e "\033[1;36m  Deltaclaw - Discord G2 App\033[0m"
            echo ""
            echo "  deltaclaw         Enter FHS shell"
            echo "  just setup        Install dependencies"
            echo "  just proxy        Start Discord/STT proxy"
            echo "  just dev          Start Vite dev server"
            echo ""
            export DELTACLAW_CWD="$PWD"
          '';
        };
      }
    );
}
