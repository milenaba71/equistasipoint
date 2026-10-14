/*
 * Tavole anatomiche (render 3D da Z-Anatomy, CC BY-SA 4.0 — vedi tools/anatomy).
 * Sistema di coordinate: viewBox 0 0 200 432.6, asse di simmetria x = 100.
 * Le tavole mostrano il muscolo evidenziato sul lato sinistro del disegno
 * (vista frontale = lato destro della persona, vista posteriore = lato sinistro);
 * per l'altro lato l'app specchia l'intera figura.
 */
(function () {
  const W = 200;
  const H = 432.6;
  const MIRROR = 'matrix(-1 0 0 1 200 0)';

  /**
   * Markup SVG dell'immagine di base.
   * @param {'front'|'back'} view
   * @param {string|null} muscleId  tavola con il muscolo evidenziato, oppure null per il corpo intero
   */
  function render(view, muscleId) {
    const src = 'img/anatomy/' + (muscleId ? muscleId + '-' + view : 'base-' + view) + '.webp';
    return '<image href="' + src + '" x="0" y="0" width="' + W + '" height="' + H + '" preserveAspectRatio="none"/>';
  }

  window.Body = { render, MIRROR, W, H };
})();
