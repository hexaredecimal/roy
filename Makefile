.PHONY: deps site extension lint test

all:
	./node_modules/.bin/grunt

dist:
	npm run build:all

deps:
	npm install
	npm prune

site:
	cd site/royml.fly.dev
	npm run build
	cd ../../
extension:
	cp roy-min.js misc/chrome-extension/

# Tests

lint:
	./node_modules/.bin/grunt lint

test:
	./node_modules/.bin/grunt jasmine
