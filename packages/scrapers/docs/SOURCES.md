# Źródła wydarzeń do scrapowania

## Jak znaleźć dobre źródła?

### 1. Google dorki:
```
site:warszawa.pl "wydarzenia dla dzieci"
site:*.gov.pl "kalendarz wydarzeń" dzieci
"wydarzenia dla dzieci" filetype:rss
"events" "children" site:*.pl inurl:api
```

### 2. Sprawdź lokalne:
- Strony urzędów miast
- Biblioteki publiczne
- Domy kultury
- Muzea
- Centra nauki
- Teatry dziecięce
- Aquaparki
- Zoo i ogrody botaniczne

### 3. Szukaj RSS/API:
- Dodaj `/rss` lub `/feed` do adresu
- Szukaj `/api/events` lub `/api/calendar`
- Sprawdź robots.txt strony

## Weryfikowane źródła:

### WARSZAWA

#### Biblioteki
- URL: https://www.biblionetka.pl/rss.aspx
- Typ: RSS
- Status: ✅ Działa

#### Centrum Nauki Kopernik
- URL: https://www.kopernik.org.pl/wydarzenia
- Typ: HTML
- Selektor: `.event-item`
- Status: ✅ Do sprawdzenia

#### Teatr Guliwer
- URL: https://www.teatrguliwer.pl/repertuar
- Typ: HTML
- Status: ✅ Do sprawdzenia

### KRAKÓW

#### Muzeum Inżynierii
- URL: https://www.muzeum-inzynierii.pl/wydarzenia
- Typ: HTML
- Status: ❓ Do weryfikacji

### OGÓLNOPOLSKIE

#### CzasDzieci.pl
- URL: https://czasdzieci.pl/wydarzenia/rss/
- Typ: RSS
- Status: ✅ Działa

## Szablon dodawania nowego źródła:

```typescript
// packages/scrapers/src/scrapers/nazwa-scraper.ts
export class NazwaScraper extends BaseScraper {
  name = 'nazwa-zrodla'
  sourceUrl = 'https://strona.pl/wydarzenia'
  
  protected async scrapeEvents() {
    // 1. Sprawdź strukturę HTML na stronie
    // 2. Znajdź selektory CSS dla:
    //    - Tytuł wydarzenia
    //    - Data i godzina
    //    - Miejsce
    //    - Opis
    //    - Wiek dzieci
    //    - Cena
    // 3. Zaimplementuj logikę
  }
}
```

## Wskazówki:

1. **Zacznij od RSS** - najprostsze
2. **Sprawdź robots.txt** - czy można scrapować
3. **Testuj w przeglądarce** - DevTools → Network
4. **Szukaj API** - często ukryte, ale istnieją
5. **Bądź etyczny** - nie przeciążaj serwerów

## Problematyczne źródła:

- Facebook - wymaga API i aprobaty
- Instagram - bardzo trudny do scrapowania
- Strony z Cloudflare - blokują boty
- SPA (React/Vue) - wymagają Playwright/Puppeteer