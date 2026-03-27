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
          libx11 libxcomposite libxdamage libxext
          libxfixes libxrandr libxcb libxshmfence
          webkitgtk_4_1 libsoup_3
          gst_all_1.gstreamer gst_all_1.gst-plugins-base
          gst_all_1.gst-plugins-good gst_all_1.gst-plugins-bad
          gst_all_1.gst-libav
        ];

        fhs = pkgs.buildFHSEnv {
          name = "deltaclaw-fhs";
          targetPkgs = _: [ pkgs.nodejs_22 pkgs.git pkgs.curl pkgs.just pkgs.psmisc ] ++ runtimeLibs;
          runScript = "bash";
          profile = ''
            cd "$DELTACLAW_CWD"
            export PATH="$DELTACLAW_CWD/node_modules/.bin:$PATH"
            export PS1="[\[\033[1;36m\]deltaclaw\[\033[0m\]:\[\033[1;32m\]\W\[\033[0m\]]$ "

            if [ ! -d node_modules ] || [ package.json -nt node_modules/.package-lock.json ]; then
              echo -e "\033[1;33m  Installing dependencies...\033[0m"
              npm install --no-fund --no-audit
            fi

            echo ""
            echo -e "\033[1;36m  Deltaclaw - Discord G2 App\033[0m"
            echo ""
            echo "  just dev          Start Vite dev server"
            echo "  just simulate     Launch Even Hub simulator"
            echo "  just qr           QR code to sideload on glasses"
            echo "  just pack         Package .ehpk for submission"
            echo "  vercel deploy     Deploy Hey Even function"
            echo ""
          '';
        };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [ fhs pkgs.just ];
          shellHook = ''
            export DELTACLAW_CWD="$PWD"
            # Skip exec when running via nix develop -c (non-interactive)
            if [ -z "$DELTACLAW_NO_FHS" ] && [ -t 0 ]; then
              exec deltaclaw-fhs
            fi
          '';
        };
      }
    );
}
