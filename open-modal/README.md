# Modal (native `<dialog>`)

Een toegankelijke modal op basis van het native `<dialog>`-element. Alles wordt ingesteld met `data-`attributen in de HTML. In de JS hoef je niets aan te passen.

## Wat het doet

- Bouwt automatisch een header met titel en sluitknop.
- Opent via een knop, of automatisch bij het laden van de pagina (standaard één keer per bezoeker, optioneel bij elk paginabezoek).
- Laadt iframes pas wanneer de modal opent en leegt ze bij sluiten.
- Regelt de focus: bij openen naar de koptekst, bij sluiten terug naar de knop.

## Minimaal voorbeeld

```html
<button data-modal-open="welkom">Open</button>

<dialog id="welkom" data-modal data-modal-title="Welkom">
  <div class="modal__body">
    <h3>Kopje voor de inhoud</h3>
    <p>Inhoud…</p>
  </div>
</dialog>
```

## Opties

### Op het `<dialog>`-element

| Attribuut | Verplicht | Standaard | Omschrijving |
| --- | --- | --- | --- |
| `data-modal` | Ja | n.v.t. | Markeert de `<dialog>` als modal. Zonder dit attribuut wordt het element genegeerd. |
| `data-modal-title="Tekst"` | Nee | geen titel | Maakt bovenaan een `<h2 class="modal__title">` met deze tekst. De titel wordt via `aria-labelledby` de naam van de dialog. Is `aria-labelledby` al aanwezig, dan blijft die ongemoeid. |
| `data-modal-close-label="Tekst"` | Nee | `Sluiten` | Toegankelijke naam (`aria-label`) van de sluitknop. Handig voor andere talen. |
| `data-modal-auto` of `data-modal-auto="sleutel"` | Nee | uit | Opent de modal automatisch bij het laden van de pagina, standaard één keer per bezoeker. Zie [Automatisch openen](#automatisch-openen). |
| `data-modal-always` | Nee | uit | Werkt samen met `data-modal-auto`. De modal opent bij elk paginabezoek, ook als de bezoeker hem al eerder zag. Er wordt niets in `localStorage` opgeslagen. Zonder `data-modal-auto` heeft dit attribuut geen effect. |

### Op een knop of link

| Attribuut | Omschrijving |
| --- | --- |
| `data-modal-open="dialog-id"` | Opent de dialog met dit `id` bij een klik. Na sluiten keert de focus terug naar deze knop. |
| `data-modal-close` | Elk element binnen de dialog met dit attribuut sluit de modal bij een klik. De automatisch gemaakte sluitknop gebruikt dit ook. |

### Op een `<iframe>` binnen de dialog

| Attribuut | Omschrijving |
| --- | --- |
| `data-src="https://..."` | Gebruik `data-src` in plaats van `src`. De iframe wordt pas geladen als de modal opent en gaat bij sluiten terug naar `about:blank`. Dat spaart laadtijd en stopt video of audio. |

```html
<iframe data-src="https://www.youtube.com/embed/..." title="Video"></iframe>
```

## Automatisch openen

Met `data-modal-auto` opent de modal vanzelf bij het laden van de pagina. Er zijn twee modi.

### Eén keer per bezoeker (standaard)

De modal opent één keer. Dat wordt onthouden in `localStorage` onder de sleutel `modal-seen:<sleutel>`.

```html
<!-- Sleutel = id van de dialog ("welkom") -->
<dialog id="welkom" data-modal data-modal-auto>

<!-- Eigen sleutel -->
<dialog id="welkom" data-modal data-modal-auto="actie-2027">
```

- **Zonder waarde** wordt het `id` van de dialog als sleutel gebruikt.
- **Opnieuw tonen** aan bezoekers die de modal al zagen kan door de sleutel te wijzigen (bijvoorbeeld `actie-2027`).
- **Gebruik altijd een `id` of een waarde.** Zonder beide is de sleutel `modal-seen:undefined` en delen meerdere dialogs dezelfde sleutel.
- **Moment van opslaan:** de sleutel wordt opgeslagen vóór het openen. Een bezoeker die de pagina direct wegklikt, telt dus al als "gezien".
- **Zonder `localStorage`** (bijvoorbeeld geblokkeerd in de browser) opent de modal niet.

### Bij elk paginabezoek

Voeg `data-modal-always` toe en de modal opent bij elk bezoek aan de pagina.

```html
<dialog id="welkom" data-modal data-modal-auto data-modal-always>
```

- Er wordt niets opgeslagen, dus een sleutel of waarde is niet nodig.
- Werkt ook als `localStorage` geblokkeerd is.
- Dit kan voor bezoekers snel irritant worden, vooral op pagina's die ze vaak herhalen. Gebruik het alleen voor meldingen die echt bij elk bezoek getoond moeten worden.

## Automatisch gedrag

Hiervoor is geen instelling nodig.

- **Header:** een `<div class="modal__header">` met titel en sluitknop wordt aangemaakt als die ontbreekt. Een bestaande `.modal__header`, `.modal__title` of `.modal__close` in de HTML wordt hergebruikt en niet dubbel toegevoegd.
- **Focus bij openen:** een `<h3>` binnen `.modal__body` krijgt `tabindex="-1"` en ontvangt de initiële focus. Zonder zo'n `<h3>` geldt de standaardfocus van `<dialog>`.
- **Escape:** sluit de modal en zet de focus terug op de knop waarmee hij geopend werd.

## Verwachte HTML-structuur

```html
<dialog id="..." data-modal data-modal-title="...">
  <div class="modal__body">
    <h3>...</h3>
    ...
  </div>
</dialog>
```

De header wordt bovenaan in de dialog geplaatst, dus die hoef je zelf niet toe te voegen.

## Toegankelijkheid

- De dialog is een native `<dialog>` en wordt geopend met `showModal()`. De browser zorgt daardoor voor de focus-trap en het inert maken van de rest van de pagina.
- De titel is gekoppeld via `aria-labelledby`.
- De sluitknop heeft een `aria-label`. Het `×`-icoon zelf is verborgen voor schermlezers (`aria-hidden`).
- Bij sluiten keert de focus terug naar het element dat de modal opende.
