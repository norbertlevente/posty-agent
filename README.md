## Használat AI-ügynökkel

A csomag tartalmazza a [`SKILL.md`](./SKILL.md) fájlt: ez a teljes
parancsreferencia, kifejezetten ügynököknek írva. Telepítés után irányítsd rá az
ügynököt, és további magyarázat nélkül használja az egész CLI-t.

Ez a repó Claude Code pluginként is be van állítva
(`.claude-plugin/`), ugyanezzel a skillel.

---

# Posty CLI

**Közösségimédia-ütemezés a parancssorból — vagy az AI-ügynöködből.**

A Posty magyar közösségimédia-ütemező. Ez a parancssori felülete: ugyanazt a
nyilvános API-t használja, mint a webes alkalmazás, tehát amit itt ütemezel,
megjelenik a Posty naptáradban, és amit ott ütemezel, azt itt is látod.

A Postyban **szándékosan nincs AI szövegíró**. Úgyis fizetsz egy jó modellért;
a CLI azért van, hogy az a modell közvetlenül a naptáradba dolgozhasson, ahelyett
hogy két ablak között másolgatnál. A [`SKILL.md`](./SKILL.md) kifejezetten
AI-ügynököknek íródott: ha ráirányítod a Claude-ot, a ChatGPT-t, a Codexet, a
Muse-t, az OpenClaw-t vagy a Hermest, további magyarázat nélkül használják az
egész CLI-t.

> A parancsok, a kapcsolók és a kimenet angolul vannak. Ez szándékos: a
> parancssort fejlesztők és ügynökök használják. Maga a termék magyar.

## Telepítés

```bash
npm install -g posty-cli
# vagy
pnpm install -g posty-cli
```

> **A csomag neve `posty-cli`, a parancsé `posty`.**
> Ez a kettő szándékosan tér el. Az npm-en a sima `posty` név egy tőlünk
> független projekté, tehát az `npm install -g posty` valaki más csomagját
> telepíti — sikeresen és némán, és pont ezért érdemes kimondani.

## Hitelesítés

**1. lehetőség: OAuth2 (ajánlott)**

```bash
posty auth:login     # device flow, böngészőt nyit
posty auth:status    # ellenőrzi, hogy még érvényes-e
posty auth:logout    # törli a tárolt hitelesítő adatokat
```

A hitelesítő adatok a `~/.posty/credentials.json` fájlba kerülnek `0600`
jogosultsággal, egy `0700` könyvtárban, a beállításoktól elkülönítve — így a
`logout` a titkokat törli, a konfigurációdat békén hagyja.

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

Ha az `analytics:post` `{"missing": true}` értéket ad vissza, a poszt megjelent,
de a platform nem adott vissza használható azonosítót. Ilyenkor:

```bash
posty posts:missing <post-id>                     # elérhető tartalmak a szolgáltatótól
posty posts:connect <post-id> --release-id "<id>" # összekötés
posty analytics:post <post-id>                    # most már működik
```

### Média

```bash
posty upload fajl.jpg
```

**Minden `-m`-nek átadott értéknek a `posty upload`-ból kell származnia.** A
nyers fájlnevek (`kep.jpg`) és a külső URL-ek (`https://...`) nem működnek: a
platformok csak a Posty által kiszolgált címeket fogadják el.

### Beállítások

```bash
posty config:set timezone Europe/Budapest
posty config:get
```

## Csatornaspecifikus beállítások

A pontos sémát mindig a `posty integrations:settings <id>` adja. Röviden:

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

`post_type`: `post` vagy `story`. Oldalakra publikál, nem személyes profilra.

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

**Felderítés.** Az ügynök ne tippeljen: `integrations:list` adja a valóban
összekötött csatornákat, `integrations:settings <id>` pedig azt, hogy mit fogad
el. Ami nincs az `integrations:list` kimenetében, arra nem lehet posztolni.

**Kimeneti szerződés.** Az eredmény **JSON a stdout-on**, az állapot és a hiba a
**stderr**-en, és minden hiba nem nulla kilépési kóddal zárul:

```bash
posty integrations:list | jq -r '.[].id'
```

**JSON mód.** Összetett kampányhoz írd meg a posztot fájlba, és add át
`--json`-nal. Működő példák: [`examples/`](./examples).

**Szálak.** A `-c` ismétlésével épül a szál — az első a poszt, a többi a
hozzászólás. Minden `-m` ahhoz a `-c`-hez tartozik, amelyik előtte áll:

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

**Kampány több csatornára, csatornánként más szöveggel** — írd JSON-ba, és
add át `--json`-nal; lásd
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
| `POSTY_API_URL` | nem | `https://posty.hu/api` | Az API végpont felülírása |
| `POSTY_TIMEZONE` | nem | — | IANA időzóna az eltolás nélküli dátumokhoz |
| `POSTY_AUTH_SERVER` | nem | `https://posty.hu` | OAuth2 szerver (saját üzemeltetéshez) |
| `POSTY_CLIENT_NAME` | nem | `posty-cli` | A device flow-ban megjelenő kliensnév |

## Dátumok és időzónák

A puszta `"2026-12-31 12:00"` kétértelmű, és a CLI **inkább hibát ad**, mint hogy
csendben egy órával máskor publikáljon. A feloldás sorrendje:

1. explicit eltolás a dátumban — `2026-12-31T12:00:00Z` vagy `+01:00`
2. `--timezone Europe/Budapest`
3. `POSTY_TIMEZONE`
4. `posty config:set timezone Europe/Budapest`

Ha egyik sincs, a parancs hibával áll le, és a hibaüzenet mind a négy megoldást
megnevezi. Számokban megadott eltolás időzónaként nem fogadható el.

## Hibakezelés

Minden hiba a stderr-re megy, és a kilépési kód nem nulla — a stdout így
gépi feldolgozásra tiszta marad.

| Hiba | Jelentése |
|---|---|
| `--date is required...` | Ütemezéshez dátum kell, vagy használj `-t now`-t |
| `--integrations is required...` | Nincs megadva csatorna; `integrations:list` |
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
| `pnpm run build` | Fordítás `dist/`-be |
| `pnpm run dev` | Fordítás figyeléssel |
| `pnpm run release:check` | Csomag- és publikálás-ellenőrzés (nem publikál) |

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

Amit ténylegesen használni tudsz, azt az `integrations:list` mondja meg — a
táblázat azt mutatja, mit támogat a Posty, a parancs azt, hogy te mit kötöttél
össze.

## Hozzájárulás

1. Forkold a projektet
2. Készíts branchet (`git checkout -b feature/valami`)
3. Fordíts és próbáld ki: `pnpm run build && node dist/index.js --help`
4. Nyiss pull requestet

## Linkek

- Weboldal: [posty.hu](https://posty.hu)
- npm: [posty-cli](https://www.npmjs.com/package/posty-cli)
- GitHub: [norbertlevente/posty-agent](https://github.com/norbertlevente/posty-agent)

## Licenc

AGPL-3.0, lásd a [LICENSE](./LICENSE) fájlt.

© 2026 Kiss Industries
