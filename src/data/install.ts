import media from "./media.json" with { type: "json" };

const v = media.version;
const release = `https://github.com/auroq/botropolis/releases/download/v${v}`;

export interface Distro {
  id: string;
  label: string;
  note: string;
  command: string;
}

export const distros: Distro[] = [
  { id: "arch", label: "Arch", note: "From the AUR; botropolis-bin skips the build.", command: "paru -S botropolis" },
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
