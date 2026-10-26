# botropolis.city

The website for [Botropolis](https://github.com/Botropolis-City/botropolis), and the infrastructure that serves it.

| path | what |
| --- | --- |
| `src/` | the site: Astro pages and components, with TypeScript for the few interactive parts |
| `src/data/media.json` | every still, clip and view the page shows, written by `make media-import` |
| `src/assets/media/` | stills as WebP; Astro resizes them into AVIF `srcset`s at build |
| `public/` | copied as-is: `_headers`, icons |
| `tools/` | the media importer and uploader |
| `wrangler.jsonc` | the `botropolis-city` Worker: serves `dist/`, static assets only, no code |
| `infra/` | Terraform for both Cloudflare zones: custom domains, the `.dev` redirect, email, DNS |
| `testing/acceptance/verify.sh` | asserts the live end state of both domains |

The registrar is Namecheap.
The nameserver delegation for both domains lives in the `namecheap` repo, not here.

## Who owns what

CI deploys the Worker on every push to `main`.
Terraform owns the edge around it, which is everything the Worker cannot carry itself.
The two are independent once bootstrapped, with one ordering rule:
a custom domain can only bind to a Worker that already exists, so the first deploy has to happen before the first apply.

| hostname | does |
| --- | --- |
| `botropolis.city`, `www.botropolis.city` | the site |
| `botropolis.dev`, `www.botropolis.dev` | 301 to the same path on `botropolis.city` |
| `media.botropolis.city` | the R2 bucket `botropolis-media`: video, under content-hashed names |
| `hello@`, `security@botropolis.city` | forward to the maintainer |

`botropolis.dev` sends and receives no mail, and says so: null MX, `v=spf1 -all`, DMARC `p=reject`.

## Working on the site

```
make site-dev        # astro dev, live reload, http://localhost:4321
make site-preview    # dist/ exactly as the Worker serves it, headers included
make test            # vitest, then Playwright against site-preview
make lint            # astro check, terraform fmt, script syntax
```

Playwright uses pacman's `/usr/bin/chromium` locally (`CHROMIUM=` to point elsewhere) and the runner's Chrome in CI; it never downloads a browser.
`BASE_URL=https://botropolis.city make test-acceptance` runs the same suite against production.

The page is dark only.
Every frame of the city is filmed on `#12141a`, the app's own background, so the page uses exactly that and the city sits on it without a box.
The palette, radius and grid are copied from `pkg/ui/theme.go` in the app.

Single-key shortcuts (`?` lists them) are ignored while typing or holding a modifier, and the `?` dialog switches them off for good, as WCAG 2.1.4 requires.

## The release

The site never types a version number.
Its build reads botropolis's latest release from GitHub, and the release's notes are the "new in" section; a build that cannot reach GitHub fails rather than guess.
Only `src/data/release.ts` names past versions, each for what it measured or changed, and a unit test fails on a version number anywhere else in `src/`.
`media.json` names the version the film was made from, which the theatre captions as such.

botropolis's release workflow runs this repo's `site` workflow as its last step, so the site rebuilds minutes after every release.
If the site does not show a new version, run `site` by hand from the Actions tab.

`make test` builds and tests against the invented release in `testing/fixtures/release.json`, so it needs no network and proves the page is driven by its source.
With `BASE_URL` set, and in CI, it uses the real one.

## Media

The media is filmed in the botropolis repo by `make demo-media`, from demo sessions rather than anyone's real ones.

```
make media-import    # DEMO_DIR=../botropolis/dist/demo by default
make media-upload    # clips to R2; already-uploaded ones are skipped
```

The import writes stills to `src/assets/media/` and clips to `.media/` (gitignored) under content-hashed names, and describes all of it in `src/data/media.json`.
Upload before pushing a `media.json` that names new clips: CI checks every clip it names is served, and fails otherwise.
GIFs are not imported; they are for the app's README.

Until the city films a still per view, the nine views are frames of `layers/views.mp4` at the seconds `tools/import-media.ts` names.
Refilming that clip can move them, so look at the views section after an import.

## Secrets

Nothing secret is stored in this repo or in a `.env`.

| token | lives in | used by |
| --- | --- | --- |
| infra | the HCP workspace, as the sensitive env var `CLOUDFLARE_API_TOKEN` | Terraform runs on HCP |
| deploy | the repo secret `CLOUDFLARE_API_TOKEN`, and 1Password for `make site-deploy` | `wrangler deploy` |

The account also holds other zones, so the infra token names these two zones explicitly rather than "all zones".

**Infra token** (Zone Resources: `botropolis.city`, `botropolis.dev`; Account Resources: the account holding them)

- Zone → Zone → Read
- Zone → DNS → Edit
- Zone → Zone Settings → Edit
- Zone → Bot Management → Edit
- Zone → Single Redirect → Edit
- Zone → Email Routing Rules → Edit
- Zone → Workers Routes → Edit
- Account → Workers Scripts → Edit
- Account → Workers R2 Storage → Edit
- Account → Email Routing Addresses → Edit

**Deploy token**

- Account → Workers Scripts → Edit
- Account → Workers R2 Storage → Edit, for uploading video

## How changes reach the edge

The HCP workspace `Botropolis-City/botropolis-city` is connected to this repo, with working directory `infra/` and trigger pattern `infra/**`.

- A pull request touching `infra/` gets a speculative plan, posted as a check.
- A merge to `main` plans and applies.
- `make infra-plan` runs the same speculative plan from a working tree, on HCP, with the workspace's token.
  There is no local apply; HCP refuses one for a VCS-driven workspace.

## Video

Video is not a Worker asset.
It lives in R2 behind `media.botropolis.city`, because R2 answers byte-range requests, and Safari will not play an MP4 from a server that does not.
Each file is named by a hash of its content and cached as immutable, so an upload never changes what an already-deployed page points at.

R2 has to be switched on for the account once, in the dashboard under R2, before Terraform can create the bucket.

Bot Fight Mode is off for `botropolis.city`, in `infra/bots.tf`.
It answered GitHub's runners with a challenge instead of the video, and a challenge on a `<video>` request cannot be solved, so anyone it took for a bot got a player that never loads.
On the Free plan it cannot be scoped to a hostname or skipped by a rule; it is the whole zone or nothing.

## Bootstrap

Done once, and recorded so it can be repeated.

1. In Cloudflare, add both sites on the Free plan.
   Delete every record Cloudflare imports from Namecheap, because Terraform owns them all.
2. Point both domains at the Cloudflare nameservers (`namecheap` repo) and wait for both zones to show Active.
3. Create both tokens with the permissions above.
4. In HCP Terraform, create the org `Botropolis-City`, connect GitHub (the `Botropolis-City` org), and create a **version-control** workspace `botropolis-city` on this repo:
   working directory `infra`, trigger patterns `infra/**`, apply method manual for the first run.
   Add the infra token as a sensitive **environment** variable `CLOUDFLARE_API_TOKEN`.
5. Wire CI and deploy the Worker first, because a custom domain cannot bind to a Worker that does not exist (error 10092):

   ```
   secret-run --stdin "op:Botropolis/Cloudflare - Botropolis Deploy Token/credential" -- gh secret set CLOUDFLARE_API_TOKEN -R Botropolis-City/botropolis.city
   gh variable set CLOUDFLARE_ACCOUNT_ID -R Botropolis-City/botropolis.city --body "$(op read "op://Botropolis/Cloudflare - Botropolis Deploy Token/Account ID")"
   git push github main
   ```

   The push starts both the deploy job and an HCP run.
   Confirm the HCP run only once the deploy job is green.
6. Click the verification link Cloudflare sends to the forwarding address.
   Until then the API refuses the forwarding rules (`2054 Destination address is not verified`), so the first apply always fails on them.
   Click it, then start a new run.
   Test from an address other than the forwarding target: Gmail files a forwarded copy of your own message under Sent only, so a self-test looks like a failure.
7. Add `botropolis.city` under the GitHub org's Verified domains and set `github_verification_code` in `infra/variables.tf`.
8. Switch the workspace's apply method to auto.
9. `make verify` until every check is green.
