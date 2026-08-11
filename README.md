# Posty CLI

Ütemezz és tegyél közzé közösségi posztokat a parancssorból — vagy bízd az
AI-ügynöködre.

A Posty magyar közösségimédia-ütemező. Ez a parancssori felülete: ugyanazt a
nyilvános API-t használja, mint a webes alkalmazás, tehát amit itt ütemezel,
megjelenik a Posty naptáradban, és amit ott ütemezel, azt itt is látod.

```bash
npm install -g posty-cli
posty auth:login
posty integrations:list
```

> **A csomag neve `posty-cli`, a parancsé `posty`.**
> Ez a kettő szándékosan tér el. Az npm-en a sima `posty` név egy tőlünk
> független projekté, tehát az `npm install -g posty` valaki más csomagját
> telepíti — sikeresen és némán, és pont ezért érdemes kimondani.

## Mire jó

A Postyban **szándékosan nincs AI szövegíró**. Úgyis fizetsz egy jó modellért;
a CLI azért van, hogy az a modell közvetlenül a naptáradba dolgozhasson, ahelyett
hogy két ablak között másolgatnál.

Ez két helyzetben hasznos:

- **Szkriptelés.** Ütemezz be két hetet egy CSV-ből, kösd a publikálást CI-be,
  vagy készíts szálat egy changelogból.
- **AI-ügynökök.** A [`SKILL.md`](./SKILL.md) kifejezetten ügynökök számára
  íródott. Ha ráirányítod a Claude-ot, a ChatGPT-t, a Codexet, a Muse-t, az
  OpenClaw-t vagy a Hermest, további magyarázat nélkül használják az egész CLI-t.

## Első lépések

```bash
# 1. Bejelentkezés — böngészőt nyit (device flow)
posty auth:login

# 2. Nézd meg, mely csatornák vannak összekötve, és mi az azonosítójuk
posty integrations:list

# 3. Ütemezz egy posztot
posty posts:create \
  -i "INTEGRATION_ID" \
  -c "Üdv a parancssorból" \
  --date "2026-12-31T12:00:00Z"
```

Ha böngészős bejelentkezés helyett API-kulcsot használnál — szerveren vagy
ügynöknek:

```bash
export POSTY_API_KEY=az_api_kulcsod   # Beállítások → Fejlesztők, a webes felületen
```

## Parancsok

| Parancs | Mit csinál |
|---|---|
| `posts:create` | Poszt létrehozása — ütemezve, piszkozatként vagy azonnal |
| `posts:list` | Posztok listázása egy időszakban |
| `posts:delete <id>` | Poszt törlése |
| `posts:status <id>` | Poszt mozgatása piszkozat és ütemezett között |
| `posts:find-slot <id>` | A következő szabad publikálási idősáv |
| `posts:missing <id>` | Szolgáltatói tartalom hiányzó release ID-jű poszthoz |
| `posts:connect <id>` | Poszt összekötése a már közzétett tartalommal |
| `integrations:list` | Összekötött csatornák és azonosítóik |
| `integrations:groups` | Csoportok (ügyfelek) listája |
| `integrations:settings <id>` | Beállításséma, szabályok és karakterkorlát egy csatornához |
| `integrations:trigger <id> <method>` | Csatornaspecifikus lekérdezés (subreddit, tábla, …) |
| `analytics:platform <id>` | Egy csatorna analitikája |
| `analytics:post <id>` | Egy poszt analitikája |
| `upload <file>` | Média feltöltése; a kapott URL megy a `posts:create -m`-be |
| `config:set` / `config:get` | A `~/.posty/config.json` írása és olvasása |
| `auth:login` / `auth:logout` / `auth:status` | Hitelesítés kezelése |

Bármelyikhez `posty <parancs> --help` adja a kapcsolókat.

> A parancsok, a kapcsolók és a CLI kimenete angolul vannak. Ez szándékos: a
> parancssort fejlesztők és AI-ügynökök használják, és egy angol felület
> mindkettőnek természetesebb. Maga a termék magyar.

## Két dolog, ami el szokta gáncsolni az embert

**A dátumhoz időzóna kell.** A puszta `"2026-12-31 12:00"` kétértelmű, és a CLI
inkább hibát ad, mint hogy csendben egy órával máskor publikáljon. Adj meg
explicit eltolást (`2026-12-31T12:00:00Z` vagy `+01:00`), vagy használd a
`--timezone Europe/Budapest` kapcsolót, vagy állítsd be egyszer:
`posty config:set timezone Europe/Budapest`.

**A `-d` percben értendő, nem másodpercben.** Ez a szál egyes részei közötti
késleltetés. A `-d 2` két perc.

## Szálak és média

A `-c` ismétlésével építesz szálat — az első a poszt, a többi a hozzászólás.
Minden `-m` ahhoz a `-c`-hez tartozik, amelyik előtte áll:

```bash
posty posts:create \
  -i "INTEGRATION_ID" \
  -c "Első bejegyzés"     -m "https://.../egy.jpg" \
  -c "Második bejegyzés" \
  -c "Harmadik bejegyzés" -m "https://.../harom.jpg" \
  -d 2 \
  --date "2026-12-31T12:00:00Z"
```

A média-URL-eknek a `posty upload`-ból kell származniuk — az API nem fogad el
tetszőleges külső linkeket.

Bonyolultabb esethez írd meg a posztot JSON-ban, és add át a `--json`
kapcsolóval. Működő példák: [`examples/`](./examples).

## Kimeneti szerződés

Az eredmény **JSON a stdout-on**. Az állapotüzenetek és a hibák a **stderr**-re
mennek. Minden hiba nem nulla kilépési kóddal zárul. Tehát ez biztonságos:

```bash
posty integrations:list | jq -r '.[].id'
```

## Beállítások

| Változó | Alapérték | Mire való |
|---|---|---|
| `POSTY_API_KEY` | — | API-kulcs az `auth:login` helyett |
| `POSTY_API_URL` | `https://posty.hu/api` | Az API végpont felülírása |
| `POSTY_TIMEZONE` | — | IANA időzóna az eltolás nélküli dátumokhoz |

A hitelesítő adatok a `~/.posty/credentials.json` fájlba kerülnek `0600`
jogosultsággal, egy `0700` könyvtárban, a beállításoktól elkülönítve — így a
`posty auth:logout` a titkokat törli, a konfigurációdat viszont békén hagyja.

## Dokumentáció

- [SKILL.md](./SKILL.md) — a teljes parancsreferencia, AI-ügynököknek írva
- [HOW_TO_RUN.md](./HOW_TO_RUN.md) — telepítés és futtatás forrásból
- [PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md) — csatornánkénti beállítássémák
- [SUPPORTED_FILE_TYPES.md](./SUPPORTED_FILE_TYPES.md) — elfogadott médiatípusok

## Fordítás forrásból

```bash
git clone https://github.com/norbertlevente/posty-agent.git
cd posty-agent
pnpm install
pnpm run build
node dist/index.js --help
```

## Licenc

AGPL-3.0, lásd a [LICENSE](./LICENSE) fájlt.

© 2026 Kiss Industries
