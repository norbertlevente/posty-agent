## Használat AI-ügynökkel

A csomagban megtalálod a teljes, kifejezetten ügynököknek szánt
parancsreferenciát, a [`SKILL.md`](./SKILL.md) fájlt. Telepítés után mutasd meg
az ügynöknek, és további magyarázat nélkül tudja használni az egész CLI-t.

A repót Claude Code-pluginként is használhatod (`.claude-plugin/`), ugyanezzel
a skillel.

---

# Posty CLI

**Közösségimédia-ütemezés a parancssorból — vagy az AI-ügynöködből.**

A Posty magyar közösségimédia-ütemező, ez pedig a parancssori felülete.
Ugyanazt a nyilvános API-t használja, mint a webes alkalmazás: amit itt
ütemezel, megjelenik a Posty naptáradban, és amit ott ütemezel, azt itt is
látod.

A Postyban **szándékosan nincs beépített AI-szövegíró**. Úgyis fizetsz egy jó
modellért; a CLI-vel ez a modell közvetlenül a naptáradba dolgozhat, így nem kell
két ablak között másolgatnod. A [`SKILL.md`](./SKILL.md) kifejezetten
AI-ügynököknek készült. Ha megmutatod a Claude-nak, a ChatGPT-nek, a Codexnek,
a Muse-nak, az OpenClaw-nak vagy a Hermesnek, további magyarázat nélkül tudják
használni az egész CLI-t.

> A parancsok, a kapcsolók és a kimenet szándékosan angol nyelvű: a
> parancssort fejlesztők és ügynökök használják, maga a termék viszont magyar.

## Telepítés

```bash
npm install -g posty-cli
# vagy
pnpm install -g posty-cli
```

> **A csomag neve `posty-cli`, a parancsé `posty`.**
> A két név szándékosan tér el. Az npm-en a sima `posty` egy tőlünk független
> projekt neve, ezért az `npm install -g posty` sikeresen, figyelmeztetés nélkül
> valaki más csomagját telepíti.

## Hitelesítés

**1. lehetőség: OAuth2 (ajánlott)**

```bash
posty auth:login     # device flow, böngészőt nyit
posty auth:status    # ellenőrzi, hogy még érvényes-e
posty auth:logout    # törli a tárolt hitelesítő adatokat
```

A CLI a hitelesítő adatokat a `~/.posty/credentials.json` fájlban tárolja,
`0600` jogosultsággal, egy `0700` jogosultságú könyvtárban. A fájl elkülönül a
beállításoktól, így a `logout` törli a titkokat, de a konfigurációdat békén
hagyja.

**2. lehetőség: API-kulcs** — szerverhez, CI-hez, ügynökhöz:

```bash
export POSTY_API_KEY=az_api_kulcsod   # Beállítások → Fejlesztők, a webes felületen
```

## Parancsok

### Csatornák felderítése

```bash
posty integrations:list                      # összekötött csatornák és azonosítóik
posty integrations:list --group <group-id>   # egy ügyfél csatornái
posty integrations:groups                    # csoportok (ügyfelek)
posty integrations:settings <id>             # beállításséma, szabályok, karakterkorlát
posty integrations:trigger <id> <method>     # csatornaspecifikus lekérdezés
```

### Poszt létrehozása

```bash
# Egyszerű ütemezett poszt
posty posts:create -c "Tartalom" --date "2026-12-31T12:00:00Z" -i "<id>"

# Piszkozat
posty posts:create -c "Tartalom" --date "2026-12-31T12:00:00Z" -t draft -i "<id>"

# Azonnali közzététel (nem kell dátum)
posty posts:create -c "Tartalom" -t now -i "<id>"

# Médiával — a fájlt előbb fel kell tölteni
IMG=$(posty upload kep.jpg | jq -r '.path')
posty posts:create -c "Tartalom" -m "$IMG" --date "2026-12-31T12:00:00Z" -i "<id>"

# Több csatornára egyszerre
posty posts:create -c "Tartalom" --date "2026-12-31T12:00:00Z" -i "<id1>,<id2>"

# Csatornaspecifikus beállításokkal
posty posts:create -c "Tartalom" --date "2026-12-31T12:00:00Z" \
  --settings '{"who_can_reply_post":"everyone"}' -i "<x-id>"

# Összetett poszt JSON-ból
posty posts:create --json poszt.json
```

### Posztok kezelése

```bash
posty posts:list                                   # alapból -30 … +30 nap
posty posts:list --startDate "..." --endDate "..." # adott időszak
posty posts:delete <id>                            # törlés
posty posts:status <id> --status draft             # vissza piszkozatba
posty posts:status <id> --status schedule          # piszkozat sorba állítása
posty posts:find-slot <id>                         # következő szabad idősáv
```

### Analitika

```bash
posty analytics:platform <integration-id>        # csatorna, 7 nap
posty analytics:platform <integration-id> -d 30  # csatorna, 30 nap
posty analytics:post <post-id>                   # poszt, 7 nap
```

Ha az `analytics:post` `{"missing": true}` értéket ad vissza, a poszt már
megjelent, de a platformtól nem érkezett használható azonosító. Ilyenkor:

```bash
posty posts:missing <post-id>                     # elérhető tartalmak a szolgáltatótól
posty posts:connect <post-id> --release-id "<id>" # összekötés
posty analytics:post <post-id>                    # most már működik
```

### Média

```bash
posty upload fajl.jpg
```

**A `-m` értékeként csak a `posty upload` által visszaadott elérési utat adhatod
meg.** A sima fájlnevek (`kep.jpg`) és a külső URL-ek (`https://...`) nem
működnek, mert a platformok csak a Posty által kiszolgált címeket fogadják el.

### Beállítások

```bash
posty config:set timezone Europe/Budapest
posty config:get
```

## Csatornaspecifikus beállítások

A pontos sémát mindig a `posty integrations:settings <id>` mutatja. Röviden:

### X (Twitter) — `x`

```bash
posty posts:create -c "Tartalom" --date "2026-12-31T12:00:00Z" \
  --settings '{"who_can_reply_post":"everyone"}' -i "<x-id>"
```

A `who_can_reply_post` **kötelező**. Értékei: `everyone`, `following`,
`mentionedUsers`, `subscribers`, `verified`.

### Facebook — `facebook`

```bash
IMG=$(posty upload kep.jpg | jq -r '.path')
posty posts:create -c "Tartalom" -m "$IMG" --date "2026-12-31T12:00:00Z" \
  --settings '{"post_type":"post"}' -i "<facebook-id>"
```

`post_type`: `post` vagy `story`. Csak oldalakra publikálhatsz, személyes profilra
nem.

### Instagram — `instagram`, `instagram-standalone`

```bash
IMG=$(posty upload kep.jpg | jq -r '.path')
posty posts:create -c "Felirat #hashtag" -m "$IMG" --date "2026-12-31T12:00:00Z" \
  --settings '{"post_type":"post"}' -i "<instagram-id>"
```

A `post_type` **kötelező**: `post` vagy `story`.

### Threads — `threads`, Bluesky — `bluesky`

**Nincs beállításuk.** Hagyd el a `--settings` kapcsolót.

Teljes séma: [PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md).

## AI-ügynököknek

**Felderítés.** Ne hagyd, hogy az ügynök találgasson. Az `integrations:list`
megmutatja a valóban összekötött csatornákat, az `integrations:settings <id>`
pedig az elfogadott beállításokat. Amelyik csatorna nem szerepel az
`integrations:list` kimenetében, arra nem lehet posztolni.

**Kimeneti szerződés.** A parancs az eredményt **JSON-ként a stdout-ra**, az
állapotüzeneteket és a hibákat pedig a **stderr-re** írja. Hiba esetén nem nulla
kilépési kóddal áll le:

```bash
posty integrations:list | jq -r '.[].id'
```

**JSON mód.** Összetett kampánynál írd a posztot fájlba, majd add át
`--json`-nal. Működő példákat az [`examples/`](./examples) könyvtárban találsz.

**Szálak.** A `-c` kapcsoló ismétlésével építhetsz szálat: az első elem a
poszt, a többi a hozzászólás. Minden `-m` az előtte álló `-c` kapcsolóhoz
tartozik:

```bash
posty posts:create \
  -c "Első bejegyzés"     -m "$(posty upload egy.jpg | jq -r '.path')" \
  -c "Második bejegyzés" \
  -c "Harmadik bejegyzés" -m "$(posty upload harom.jpg | jq -r '.path')" \
  -d 2 \
  --date "2026-12-31T12:00:00Z" -i "<id>"
```

A `-d` **percben** értendő, nem másodpercben.

## Gyakori munkamenetek

**Kampány több csatornára, csatornánként más szöveggel** — írd JSON-fájlba,
majd add át `--json`-nal; lásd
[`examples/multi-platform-with-settings.json`](./examples/multi-platform-with-settings.json).

**Heti ütemezés szkriptből:**

```bash
DATES=("2026-09-01T09:00:00Z" "2026-09-02T09:00:00Z" "2026-09-03T09:00:00Z")
TEXTS=("Hétfői indítás" "Keddi tipp" "Szerdai tanulság")

for i in "${!DATES[@]}"; do
  posty posts:create -c "${TEXTS[$i]}" --date "${DATES[$i]}" -i "<id>"
done
```

**Karakterkorlát ellenőrzése publikálás előtt:**

```bash
MAX=$(posty integrations:settings "<id>" | jq '.output.maxLength')
```

## Környezeti változók

| Változó | Kötelező | Alapérték | Mire való |
|---|---|---|---|
| `POSTY_API_KEY` | nem | — | API-kulcs az `auth:login` helyett |
| `POSTY_API_URL` | nem | `https://posty.hu/api` | Ezzel felülírhatod az API-végpontot |
| `POSTY_TIMEZONE` | nem | — | IANA időzóna az eltolás nélküli dátumokhoz |
| `POSTY_AUTH_SERVER` | nem | `https://posty.hu` | OAuth2 szerver (saját üzemeltetéshez) |
| `POSTY_CLIENT_NAME` | nem | `posty-cli` | Az eszközengedélyezéskor megjelenő kliensnév |

## Dátumok és időzónák

Az önmagában megadott `"2026-12-31 12:00"` kétértelmű. A CLI **inkább hibával
leáll**, mint hogy csendben egy órával eltérő időpontban publikáljon. Ebben a
sorrendben keresi az időzónát:

1. a dátumban egyértelműen megadott eltolás — `2026-12-31T12:00:00Z` vagy `+01:00`
2. `--timezone Europe/Budapest`
3. `POSTY_TIMEZONE`
4. `posty config:set timezone Europe/Budapest`

Ha egyik sincs megadva, a parancs hibával leáll, a hibaüzenet pedig mind a négy
megoldást felsorolja. Időzónaként nem adhatsz meg számokkal jelölt eltolást.

## Hibakezelés

A CLI minden hibát a stderr-re ír, és nem nulla kilépési kóddal áll le. A
stdout így tisztán, géppel feldolgozható marad.

| Hiba | Jelentése |
|---|---|
| `--date is required...` | Ütemezéshez dátum kell, vagy használj `-t now`-t |
| `--integrations is required...` | Nem adtál meg csatornát; `integrations:list` |
| naiv dátum hibája | Nincs időzóna sehol; lásd fentebb |
| `Integration not found` | Rossz azonosító, vagy a csatorna már nincs összekötve |
| 401 / 403 | Lejárt vagy visszavont hitelesítés; `posty auth:login` |

## Fejlesztés

```
src/
├── index.ts        # parancsok és kapcsolók (yargs)
├── api.ts          # HTTP-kliens
├── commands/       # posts, integrations, analytics, upload, auth, config
├── dates.ts        # időzóna-feloldás
├── settings.ts     # csatornabeállítások
└── output.ts       # a JSON/stderr kimeneti szerződés
```

```bash
git clone https://github.com/norbertlevente/posty-agent.git
cd posty-agent
pnpm install
pnpm run build          # tsup → dist/index.js
node dist/index.js --help
```

| Szkript | Mit csinál |
|---|---|
| `pnpm run build` | Lefordítja a kódot a `dist/` könyvtárba |
| `pnpm run dev` | Figyeli és újrafordítja a kódot |
| `pnpm run release:check` | Ellenőrzi a csomagot és a publikálást (nem publikál) |

## Gyorsreferencia

```bash
# Hitelesítés
posty auth:status
posty auth:login
posty auth:logout

# Felderítés
posty integrations:list
posty integrations:settings <id>
posty integrations:trigger <id> <method>

# Posztolás
posty posts:create -c "szöveg" --date "2026-12-31T12:00:00Z" -i "<id>"
posty posts:create -c "szöveg" -t draft --date "..." -i "<id>"
posty posts:create -c "szöveg" -t now -i "<id>"
posty posts:create --json fajl.json

# Kezelés
posty posts:list
posty posts:delete <id>
posty posts:status <id> --status draft
posty posts:find-slot <id>
posty upload <fajl>

# Analitika
posty analytics:platform <id> -d 30
posty analytics:post <id>
posty posts:missing <id>
posty posts:connect <id> --release-id "<rid>"
```

## Dokumentáció

- [SKILL.md](./SKILL.md) — a teljes parancsreferencia, AI-ügynököknek írva
- [HOW_TO_RUN.md](./HOW_TO_RUN.md) — telepítés és futtatás forrásból
- [PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md) — csatornánkénti beállítássémák
- [SUPPORTED_FILE_TYPES.md](./SUPPORTED_FILE_TYPES.md) — elfogadott médiatípusok

## Támogatott csatornák

| Csatorna | `identifier` | Beállítások |
|---|---|---|
| X (Twitter) | `x` | `who_can_reply_post` kötelező |
| Facebook (oldalak) | `facebook` | `post_type` |
| Instagram | `instagram` | `post_type` kötelező |
| Instagram (önálló belépés) | `instagram-standalone` | `post_type` kötelező |
| Threads | `threads` | nincs |
| Bluesky | `bluesky` | nincs |

Az `integrations:list` mutatja meg, melyik csatornákat használhatod ténylegesen.
A táblázatban a Posty által támogatott csatornákat látod, a parancs kimenetében
pedig azokat, amelyeket te is összekötöttél.

## Hozzájárulás

1. Forkold a projektet
2. Hozz létre egy branchet (`git checkout -b feature/valami`)
3. Fordítsd le, majd próbáld ki: `pnpm run build && node dist/index.js --help`
4. Nyiss pull requestet

## Linkek

- Weboldal: [posty.hu](https://posty.hu)
- npm: [posty-cli](https://www.npmjs.com/package/posty-cli)
- GitHub: [norbertlevente/posty-agent](https://github.com/norbertlevente/posty-agent)

## Licenc

AGPL-3.0, lásd a [LICENSE](./LICENSE) fájlt.

© 2026 Kiss Industries
