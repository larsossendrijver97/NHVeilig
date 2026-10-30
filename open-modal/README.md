/**
 * MODAL (native <dialog>)
 * ============================================================
 *
 * OPTIES (HTML data-attributen)
 * ------------------------------------------------------------
 * Alles wordt ingesteld via data-attributen in de HTML.
 * In de JS zelf hoef je niets aan te passen.
 *
 * Op het <dialog>-element
 * ------------------------------------------------------------
 * data-modal
 *   Verplicht. Markeert de <dialog> als modal. Zonder dit
 *   attribuut wordt het element genegeerd.
 *   Voorbeeld: <dialog id="welkom" data-modal>
 *
 * data-modal-title="Tekst"
 *   Optioneel. Genereert bovenaan een <h2 class="modal__title">
 *   met deze tekst en koppelt die via aria-labelledby als naam
 *   van de dialog. Is aria-labelledby al aanwezig, dan blijft
 *   die ongemoeid.
 *
 * data-modal-close-label="Tekst"
 *   Optioneel. Toegankelijke naam (aria-label) van de sluitknop.
 *   Standaard: "Sluiten". Handig voor andere talen.
 *
 * data-modal-auto  /  data-modal-auto="sleutel"
 *   Optioneel. Opent de modal automatisch bij het laden van de
 *   pagina, maar slechts één keer per bezoeker (onthouden in
 *   localStorage onder "modal-seen:<sleutel>").
 *   - Zonder waarde wordt het id van de dialog als sleutel gebruikt.
 *   - Met waarde: wijzig de sleutel (bijv. "actie-2027") om de
 *     modal opnieuw te tonen aan bezoekers die hem al zagen.
 *   - Is localStorage niet beschikbaar, dan opent de modal niet.
 *
 * Op een knop of link
 * ------------------------------------------------------------
 * data-modal-open="dialog-id"
 *   Opent de dialog met dit id bij een klik. Na sluiten keert
 *   de focus terug naar deze knop.
 *   Voorbeeld: <button data-modal-open="welkom">Open</button>
 *
 * data-modal-close
 *   Elk element binnen de dialog met dit attribuut sluit de
 *   modal bij een klik. De automatisch gegenereerde sluitknop
 *   gebruikt dit ook.
 *
 * Op een iframe binnen de dialog
 * ------------------------------------------------------------
 * data-src="https://..."
 *   Optioneel. Gebruik data-src in plaats van src. De iframe
 *   wordt pas geladen als de modal opent en wordt op
 *   "about:blank" gezet bij sluiten. Dat spaart laadtijd en
 *   stopt video of audio.
 *
 * AUTOMATISCH GEDRAG (geen instelling nodig)
 * ------------------------------------------------------------
 * - Header: <div class="modal__header"> met titel en sluitknop
 *   wordt aangemaakt als die ontbreekt. Een bestaande
 *   .modal__header, .modal__title of .modal__close in de HTML
 *   wordt hergebruikt en niet dubbel toegevoegd.
 * - Focus bij openen: een <h3> binnen .modal__body krijgt
 *   tabindex="-1" en ontvangt de initiële focus. Zonder zo'n
 *   <h3> blijft de standaardfocus van <dialog> gelden.
 * - Escape sluit de modal en zet de focus terug op de openknop.
 *
 * BENODIGDE HTML-STRUCTUUR
 * ------------------------------------------------------------
 * <dialog id="welkom" data-modal data-modal-title="Welkom">
 *   <div class="modal__body">
 *     <h3>Kopje voor de inhoud</h3>
 *     <p>Inhoud…</p>
 *   </div>
 * </dialog>
 */
