import gsap from 'gsap';

export const pageIn = (el: HTMLElement | string) => {
  gsap.fromTo(el, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power2.out', overwrite: true, clearProps: 'transform' });
};

export const staggerCards = (container: HTMLElement | null, selector = '.gsap-card') => {
  if (!container) return;
  const cards = container.querySelectorAll(selector);
  if (!cards.length) return;
  gsap.fromTo(cards,
    { autoAlpha: 0, y: 10 },
    { autoAlpha: 1, y: 0, duration: 0.28, stagger: 0.03, ease: 'power2.out', overwrite: true, clearProps: 'transform' }
  );
};

export const staggerList = (container: HTMLElement | null, selector = '.gsap-item') => {
  if (!container) return;
  const items = container.querySelectorAll(selector);
  if (!items.length) return;
  gsap.fromTo(items,
    { autoAlpha: 0, x: -4 },
    { autoAlpha: 1, x: 0, duration: 0.22, stagger: 0.02, ease: 'power2.out', overwrite: true, clearProps: 'transform' }
  );
};
