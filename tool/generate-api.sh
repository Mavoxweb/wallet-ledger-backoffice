#!/usr/bin/env bash
# Gera o cliente TypeScript da Wallet Ledger API a partir do contrato publicado
# na release fixada em contract.version. Não edite src/app/api à mão: rode este
# script de novo.
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="$(tr -d '[:space:]' < contract.version)"
GENERATOR_VERSION="7.27.0"
WORK=".api-gen"
JAR="$WORK/openapi-generator-cli-$GENERATOR_VERSION.jar"
JAR_URL="https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/$GENERATOR_VERSION/openapi-generator-cli-$GENERATOR_VERSION.jar"

mkdir -p "$WORK"

echo "Contrato: $VERSION"
gh release download "$VERSION" -R Mavoxweb/wallet-ledger-api -p openapi.json -O "$WORK/openapi.json" --clobber

if [ ! -f "$JAR" ]; then
  curl -sSfL -o "$JAR" "$JAR_URL"
  expected="$(curl -sSfL "$JAR_URL.sha1" | cut -c1-40)"
  actual="$(sha1sum "$JAR" | cut -c1-40)"
  if [ "$expected" != "$actual" ]; then
    echo "sha1 do gerador não confere" >&2
    rm -f "$JAR"
    exit 1
  fi
fi

rm -rf src/app/api
java -jar "$JAR" generate \
  -i "$WORK/openapi.json" \
  -g typescript-angular \
  -o src/app/api \
  --additional-properties=ngVersion=22.0.0,providedIn=root,fileNaming=kebab-case,supportsES6=true \
  --skip-validate-spec \
  > "$WORK/generator.log"

# Arquivos de projeto que o gerador cria e o app não usa.
rm -rf src/app/api/.openapi-generator src/app/api/.openapi-generator-ignore \
  src/app/api/git_push.sh src/app/api/README.md src/app/api/.gitignore

npx prettier --write "src/app/api/**/*.ts" > /dev/null

echo "Cliente gerado em src/app/api"
