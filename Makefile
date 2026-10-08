# THUIE monorepo — developer task runner.
# `make help` lists targets. Needs npm + docker compose on PATH; the flutter-*
# targets need the Flutter SDK. Recipes use real TAB indentation (required).

SHELL := /bin/bash

BACKEND_DIR  := backend
FRONTEND_DIR := frontend
MOBILE_DIR   := mobile

COMPOSE := docker compose

.DEFAULT_GOAL := help

.PHONY: help install install-backend install-frontend \
        dev-backend dev-frontend dev-db db-up db-down db-reset db-seed \
        build build-backend build-frontend test \
        docker-build docker-up docker-down docker-logs docker-ps docker-clean \
        flutter-deps flutter-analyze flutter-apk flutter-web clean \
        release-keystore apk-prod aab-play

## ---- dependencies ----
install: install-backend install-frontend ## Install backend + frontend deps

install-backend: ## npm ci in backend
	cd $(BACKEND_DIR) && npm ci

install-frontend: ## npm ci in frontend
	cd $(FRONTEND_DIR) && npm ci

## ---- local dev (host, containers optional) ----
dev-db: db-up ## Alias: start Postgres

db-up: ## Start local PostgreSQL (backend/docker-compose.yml)
	cd $(BACKEND_DIR) && $(COMPOSE) up -d db

db-down: ## Stop local PostgreSQL
	cd $(BACKEND_DIR) && $(COMPOSE) down

db-reset: ## Drop + recreate schema, then reseed demo data
	cd $(BACKEND_DIR) && npm run db:reset && npm run db:seed

db-seed: ## Seed demo data
	cd $(BACKEND_DIR) && npm run db:seed

dev-backend: ## Run NestJS API in watch mode (:5000)
	cd $(BACKEND_DIR) && npm run start:dev

dev-frontend: ## Run Next.js dev server (:3001)
	cd $(FRONTEND_DIR) && npm run dev

## ---- quality ----
build: build-backend build-frontend ## Compile backend + build frontend

build-backend: ## nest build → dist/
	cd $(BACKEND_DIR) && npm run build

build-frontend: ## next build → .next/
	cd $(FRONTEND_DIR) && npm run build

test: ## Run backend unit tests
	cd $(BACKEND_DIR) && npm test

## ---- full container stack (db + backend + frontend) ----
docker-build: ## Build the app images
	$(COMPOSE) build

docker-up: ## Build & start the full stack (detached)
	$(COMPOSE) up -d --build

docker-down: ## Stop and remove the stack (keeps volumes)
	$(COMPOSE) down

docker-logs: ## Tail logs for all services
	$(COMPOSE) logs -f

docker-ps: ## List running services
	$(COMPOSE) ps

docker-clean: ## Stop the stack and remove volumes (drops DB + uploads)
	$(COMPOSE) down -v

## ---- Flutter mobile ----
flutter-deps: ## flutter pub get
	cd $(MOBILE_DIR) && flutter pub get

flutter-analyze: ## flutter analyze
	cd $(MOBILE_DIR) && flutter analyze

flutter-apk: ## Build a debug APK
	cd $(MOBILE_DIR) && flutter build apk --debug

flutter-web: ## Build Flutter web
	cd $(MOBILE_DIR) && flutter build web

## ---- mobile release (Google Play) ----
# Signing reads mobile/android/key.properties (copy key.properties.example);
# API host per stage comes from mobile/env/*.json via --dart-define-from-file.
# Edit env/production.json to your real domain before shipping.
release-keystore: ## Generate an upload keystore (then fill android/key.properties)
	keytool -genkey -v -keystore $(MOBILE_DIR)/android/app/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload

apk-prod: ## Release APK, production env, signed if key.properties present
	cd $(MOBILE_DIR) && flutter build apk --release --dart-define-from-file=env/production.json

aab-play: ## App Bundle for Google Play upload (production env)
	cd $(MOBILE_DIR) && flutter build appbundle --release --dart-define-from-file=env/production.json

## ---- misc ----
clean: ## Remove build artifacts
	rm -rf $(BACKEND_DIR)/dist $(FRONTEND_DIR)/.next

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
