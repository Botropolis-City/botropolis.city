const latest = "https://github.com/Botropolis-City/botropolis/releases/latest/download";
const pkg = "https://pkg.botropolis.city";

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
    note: `Adds the signed repository once; apt upgrade brings every release after. To install just once instead: ${latest}/botropolis_amd64.deb (or _arm64).`,
    command: [
      "sudo install -d /etc/apt/keyrings",
      `sudo curl -fsSLo /etc/apt/keyrings/botropolis.asc ${pkg}/botropolis.asc`,
      `sudo curl -fsSLo /etc/apt/sources.list.d/botropolis.sources ${pkg}/botropolis.sources`,
      "sudo apt update && sudo apt install botropolis",
    ].join("\n"),
  },
  {
    id: "fedora",
    label: "Fedora / openSUSE",
    note: `Adds the signed repository once; dnf upgrade brings every release after. On openSUSE, put the file in /etc/zypp/repos.d/ and use zypper. To install just once instead: ${latest}/botropolis.x86_64.rpm (or .aarch64).`,
    command: [
      `sudo curl -fsSLo /etc/yum.repos.d/botropolis.repo ${pkg}/botropolis.repo`,
      "sudo dnf install botropolis",
    ].join("\n"),
  },
  {
    id: "macos",
    label: "macOS",
    note: "Apple silicon or Intel. Adds the tap once; brew upgrade brings every release after. Built from source, so nothing needs signing; nobody has looked at the window on a Mac yet, so tell us what you see.",
    command: [
      `brew tap botropolis-city/botropolis ${pkg}/brew`,
      "brew install botropolis-city/botropolis/botropolis",
      "brew services start botropolis",
    ].join("\n"),
  },
];

export const start = `botropolis setup
botropolis doctor
botropolis`;

export const moved = [
  ["tui", "status --live"],
  ["resume", "attach"],
  ["prune", "rm --older-than"],
  ["install-hooks", "setup"],
] as const;

export interface Shell {
  name: string;
  file: string;
  line: string;
}

export const shells: Shell[] = [
  { name: "bash", file: "~/.bashrc", line: 'eval "$(botropolis shell-init bash)"' },
  { name: "zsh", file: "~/.zshrc", line: 'eval "$(botropolis shell-init zsh)"' },
  { name: "fish", file: "~/.config/fish/config.fish", line: "botropolis shell-init fish | source" },
];
