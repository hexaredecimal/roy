.PHONY: deps site extension lint test

all:
	./node_modules/.bin/grunt

dist:
	npm run build:all
	chmod +x dist/llml.js
	cp dist/llml.js llml

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

clean:
	rm -rf dist

  
