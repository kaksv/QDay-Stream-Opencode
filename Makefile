# StreamPay — common tasks.
# Requires: forge/cast, node 22+, pnpm 9 (corepack enable).

SHELL := /bin/bash
PNPM  ?= corepack pnpm
RPC   ?= https://rpc-test.qday.info

.PHONY: help install dev build test test-web test-contracts typecheck lint \
        anvil deploy-local deploy-aevum verify clean

help:
	@echo "install          install web dependencies"
	@echo "dev              run the Next.js dev server"
	@echo "build            production build of the web app"
	@echo "test             contracts + web tests"
	@echo "anvil            start a local chain with the Aevum chain id"
	@echo "deploy-local     deploy mock token, StreamPay and seeds to Anvil"
	@echo "deploy-aevum     simulate the Aevum deployment (no broadcast)"
	@echo "verify           verify the deployed contract on the QDay explorer"
	@echo "clean            remove build artifacts"

install:
	cd web && $(PNPM) install

dev:
	cd web && $(PNPM) dev

build:
	cd web && $(PNPM) build

typecheck:
	cd web && $(PNPM) typecheck

lint:
	cd web && $(PNPM) lint

test: test-contracts test-web

test-contracts:
	cd contracts && forge test

test-web:
	cd web && $(PNPM) test:run

anvil:
	anvil --chain-id 44005

deploy-local:
	cd contracts && forge script script/DeployLocal.s.sol:DeployLocal \
		--rpc-url http://127.0.0.1:8545 --broadcast

deploy-aevum:
	cd contracts && forge script script/Deploy.s.sol:Deploy --rpc-url $(RPC)

verify:
	@test -n "$(ADDRESS)" || (echo "usage: make verify ADDRESS=0x..." && exit 1)
	cd contracts && forge verify-contract \
		--chain-id 44005 \
		--verifier blockscout \
		--verifier-url https://explorer-test.qday.info/api \
		--constructor-args $$(cast abi-encode "constructor(address)" 0x456569838f1d43009A91ebA4263147Afd7233483) \
		$(ADDRESS) src/StreamPay.sol:StreamPay

clean:
	cd web && rm -rf .next
	cd contracts && rm -rf out cache
