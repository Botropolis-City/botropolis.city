const latest = "https://github.com/Botropolis-City/botropolis/releases/latest/download";

export interface Link {
  label: string;
  href: string;
}

export interface Distro {
  id: string;
  label: string;
  note: string;
  links?: Link[];
  command: string;
}

export const distros: Distro[] = [
  {
    id: "arch",
    label: "Arch",
    note: "Or with your AUR helper, e.g. paru -S botropolis or yay -S botropolis. botropolis-bin installs the release binaries instead of building.",
    links: [
      { label: "botropolis", href: "https://aur.archlinux.org/packages/botropolis" },
      { label: "botropolis-bin", href: "https://aur.archlinux.org/packages/botropolis-bin" },
    ],
    command: "git clone https://aur.archlinux.org/botropolis.git\ncd botropolis && makepkg -si",
  },
  {
    id: "debian",
    label: "Debian / Ubuntu",
    note: "Always the latest release. On arm64, botropolis_arm64.deb.",
    command: `curl -LO ${latest}/botropolis_amd64.deb\nsudo apt install ./botropolis_amd64.deb`,
  },
  {
    id: "fedora",
    label: "Fedora / openSUSE",
    note: "Always the latest release. On aarch64, botropolis.aarch64.rpm.",
    command: `sudo dnf install ${latest}/botropolis.x86_64.rpm`,
  },
];

export const start = `systemctl --user enable --now botropolisd
botropolis install-hooks
botropolis doctor
botropolis`;

export const shell = "source /usr/share/botropolis/botropolis.bash";
