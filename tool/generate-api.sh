#!/usr/bin/env bash
# Gera o cliente TypeScript da Wallet Ledger API a partir do contrato fixado
# em contract.version. Uma release (v0.2.0) traz o openapi.json publicado.
# Um ref git sem release — o commit do main, enquanto a tag não existe —
# usa contracts/openapi.json desse commit. Não edite src/app/api à mão.
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="$(tr -d '[:space:]' < contract.version)"
GENERATOR_VERSION="7.27.0"
WORK=".api-gen"
JAR="$WORK/openapi-generator-cli-$GENERATOR_VERSION.jar"
JAR_URL="https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/$GENERATOR_VERSION/openapi-generator-cli-$GENERATOR_VERSION.jar"
REPO="Mavoxweb/wallet-ledger-api"

mkdir -p "$WORK"

echo "Contrato: $VERSION"
if gh release view "$VERSION" -R "$REPO" >/dev/null 2>"$WORK/release.err"; then
  gh release download "$VERSION" -R "$REPO" -p openapi.json -O "$WORK/openapi.json" --clobber
elif grep -q "release not found" "$WORK/release.err"; then
  # Sem tag publicada: o mesmo ref que o CI faz checkout já tem o contrato no repositório.
  echo "Sem release ${VERSION}; usando contracts/openapi.json desse ref"
  gh api \
    -H "Accept: application/vnd.github.raw" \
    "repos/${REPO}/contents/contracts/openapi.json?ref=${VERSION}" \
    > "$WORK/openapi.json"
else
  cat "$WORK/release.err" >&2
  exit 1
fi

node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); if(!j.openapi) process.exit(1)" \
  "$WORK/openapi.json"

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
