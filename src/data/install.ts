export const version = "0.1.5";

const v = version;
const release = `https://github.com/Botropolis-City/botropolis/releases/download/v${v}`;

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
    note: "amd64 shown; arm64 is beside it on the release.",
    command: `curl -LO ${release}/botropolis_${v}_amd64.deb\nsudo apt install ./botropolis_${v}_amd64.deb`,
  },
  {
    id: "fedora",
    label: "Fedora / openSUSE",
    note: "x86_64 shown; aarch64 is beside it on the release.",
    command: `sudo dnf install ${release}/botropolis-${v}-1.x86_64.rpm`,
  },
];

export const start = `systemctl --user enable --now botropolisd
botropolis install-hooks
botropolis doctor
botropolis`;

export const shell = "source /usr/share/botropolis/botropolis.bash";
