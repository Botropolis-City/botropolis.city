GREEN := "\033[0;32m"
NC := "\033[0;0m"

LOG := @sh -c '\
       printf ${GREEN}; \
       echo -e "\n> $$1\n"; \
       printf ${NC}' VALUE

-include .env

CF_DEPLOY_TOKEN_REF ?= op:Botropolis/Cloudflare - Botropolis Deploy Token/credential
MEDIA_BUCKET ?= botropolis-media
MEDIA_HOST ?= https://media.botropolis.city
BOTROPOLIS_DIR ?= ../botropolis
DEMO_DIR ?= ${BOTROPOLIS_DIR}/dist/demo
RELEASE_FIXTURE ?= $(if ${BASE_URL},,testing/fixtures/release.json)
TF := terraform -chdir=infra
WITH_DEPLOY_TOKEN := secret-run --env "CLOUDFLARE_API_TOKEN=${CF_DEPLOY_TOKEN_REF}" --

targets ::
	@awk -F'::?[[:space:]]*' '/^[a-zA-Z0-9][^$#\/\t=]*::?([^=]|$$)/ { \
		gsub(/^[[:space:]]+|[[:space:]]+$$/, "", $$1); \
		gsub(/^[[:space:]]+|[[:space:]]+$$/, "", $$2); \
		split($$1,A,/ /); \
		target=A[1]; \
		deps=$$2; \
		printf "%s", target; \
		if (deps) printf " → %s", deps; \
		print "" \
	}' $(MAKEFILE_LIST)

node_modules :: package.json package-lock.json
	$(LOG) "Installing dependencies"
	@npm ci

site-dev :: node_modules
	$(LOG) "Serving the site with live reload on http://localhost:4321"
	@npx astro dev

site-build :: node_modules
	$(LOG) "Building the site into dist/"
	@npx astro build

site-preview :: site-build
	$(LOG) "Serving dist/ as the Worker would, headers included, on http://localhost:8787"
	@npx wrangler dev

site-deploy :: site-build
	$(LOG) "Deploying dist/ to the botropolis-city Worker"
	@$(WITH_DEPLOY_TOKEN) npx wrangler deploy

media-import :: node_modules
	$(LOG) "Importing media from ${DEMO_DIR}"
	@BOTROPOLIS_DIR=${BOTROPOLIS_DIR} DEMO_DIR=${DEMO_DIR} MEDIA_BASE=${MEDIA_HOST} node tools/import-media.ts

media-upload :: node_modules
	$(LOG) "Uploading clips in .media/ to R2 bucket ${MEDIA_BUCKET}"
	@MEDIA_BUCKET=${MEDIA_BUCKET} MEDIA_HOST=${MEDIA_HOST} $(WITH_DEPLOY_TOKEN) tools/upload-media.sh

test-unit :: node_modules
	$(LOG) "Unit tests"
	@npx vitest run

test-acceptance : export BOTROPOLIS_RELEASE = ${RELEASE_FIXTURE}
test-acceptance :: site-build
	$(LOG) "Acceptance tests against $${BASE_URL:-a local wrangler dev}, with the release in ${RELEASE_FIXTURE}"
	@npx playwright test

test-infra ::
	$(LOG) "Terraform tests, against a mocked provider"
	@$(TF) init -backend=false -input=false >/dev/null
	@$(TF) test

test :: test-unit test-infra test-acceptance

infra-fmt ::
	$(LOG) "Formatting Terraform"
	@$(TF) fmt

infra-init ::
	$(LOG) "Initializing Terraform"
	@$(TF) init

infra-validate :: infra-init
	$(LOG) "Validating Terraform"
	@$(TF) validate

infra-plan :: infra-init
	$(LOG) "Speculative plan on HCP Terraform (applies happen on merge to main)"
	@$(TF) plan

soak-credentials :: infra-init
	$(LOG) "Copying the soak bucket's write and read keys into 1Password"
	@SOAK_WRITE_ITEM="${SOAK_WRITE_ITEM}" SOAK_READ_ITEM="${SOAK_READ_ITEM}" node tools/store-soak-credentials.ts

name-servers :: infra-init
	$(LOG) "Cloudflare name servers, for the namecheap repo"
	@$(TF) output name_servers

verify ::
	$(LOG) "Checking the live domains"
	@testing/acceptance/verify.sh

lint :: node_modules
	$(LOG) "Linting"
	@npx astro check
	@$(TF) fmt -check -recursive
	@for f in testing/acceptance/verify.sh tools/upload-media.sh; do bash -n "$$f" || exit 1; done
