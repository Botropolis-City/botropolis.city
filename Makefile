GREEN := "\033[0;32m"
NC := "\033[0;0m"

LOG := @sh -c '\
       printf ${GREEN}; \
       echo -e "\n> $$1\n"; \
       printf ${NC}' VALUE

-include .env

CF_DEPLOY_TOKEN_REF ?= op:Botropolis/Cloudflare - Botropolis Deploy Token/credential
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
	$(LOG) "Installing wrangler"
	@npm ci

site-dev :: node_modules
	$(LOG) "Serving site/ locally"
	@npx wrangler dev

site-deploy :: node_modules
	$(LOG) "Deploying site/ to the botropolis-city Worker"
	@$(WITH_DEPLOY_TOKEN) npx wrangler deploy

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

name-servers :: infra-init
	$(LOG) "Cloudflare name servers, for the namecheap repo"
	@$(TF) output name_servers

verify ::
	$(LOG) "Checking the live domains"
	@testing/acceptance/verify.sh

lint ::
	$(LOG) "Linting"
	@$(TF) fmt -check -recursive
	@bash -n testing/acceptance/verify.sh
